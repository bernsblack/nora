import { expect, test } from "@playwright/test";

/**
 * Setting a person up.
 *
 * PROJECT.md section 6: the family sets the answer policy "during setup, as an
 * explicit choice, not a default they discover later". Before this flow existed
 * the app had no setup at all, and the policy sat in a settings section with
 * the fallback already selected in a dropdown. A family member who never
 * scrolled that far had a policy chosen for them by a form control, and the
 * page presented it as their decision.
 *
 * These tests are about the three properties in that sentence, not about the
 * layout: it happens during setup, it is explicit, and no default is applied
 * on their behalf.
 */

/** A person nobody has decided for yet. The ordinary fixtures ship a decided one. */
test.beforeEach(async ({ request }) => {
  await request.post("/api/test-reset?setup=incomplete");
});

test("sends a family member who has not decided to setup, not to settings", async ({ page }) => {
  await page.goto("/app/person-marta");
  await expect(page).toHaveURL(/\/app\/person-marta\/setup/);
  await expect(page.getByTestId("setup")).toBeVisible();
});

test("offers no answer already chosen", async ({ page }) => {
  await page.goto("/app/person-marta/setup");

  // The whole requirement in one assertion. Every option unchecked means the
  // family member has to answer, rather than confirm something a form decided.
  const options = page.getByRole("radio");
  await expect(options).toHaveCount(3);
  for (const option of await options.all()) {
    await expect(option).not.toBeChecked();
  }
});

test("refuses to continue until something is chosen", async ({ page }) => {
  await page.goto("/app/person-marta/setup");
  await page.getByRole("button", { name: "Save and continue", exact: true }).click();

  // Still here. This is the browser's own required check doing the work; the
  // server guard is covered separately below, because a test that only ever
  // exercises the client one would pass with no server guard at all.
  await expect(page).toHaveURL(/\/setup/);
  await expect(page.getByTestId("setup")).toBeVisible();
});

test("refuses on the server too, not only in the browser", async ({ page }) => {
  await page.goto("/app/person-marta/setup");

  // Strip the browser's guard so the empty submission actually reaches the
  // action. Anyone can do this, and more to the point the guard is absent
  // whenever scripting is off or a form is posted by something other than this
  // page, so the refusal cannot live in an HTML attribute.
  await page.evaluate(() => {
    document
      .querySelectorAll('input[name="defaultMode"]')
      .forEach((radio) => radio.removeAttribute("required"));
  });
  await page.getByRole("button", { name: "Save and continue", exact: true }).click();

  await expect(page.getByTestId("problems")).toBeVisible();
  await expect(page.getByTestId("problems")).toContainText(/Choose what Nora should do/);
  await expect(page).toHaveURL(/\/setup/);
});

test("keeps the choice, and the options' meaning, through a refusal", async ({ page }) => {
  await page.goto("/app/person-marta/setup");

  // Force a server refusal that carries a mode, which is what a lapsed session
  // produces once real authentication replaces the mock.
  await page.evaluate(() => {
    const first = document.querySelector('input[name="defaultMode"]') as HTMLInputElement;
    first.value = "not-a-mode";
    first.checked = true;
  });
  await page.getByRole("button", { name: "Save and continue", exact: true }).click();
  await expect(page.getByTestId("problems")).toBeVisible();

  // Each option must still submit its own mode. React clears an uncontrolled
  // form on resolve and the restore that puts it back used to write the sent
  // value onto every radio sharing the name, so all three labels ended up
  // submitting one mode and the next click saved something never chosen.
  const values = await page
    .getByRole("radio")
    .evaluateAll((radios) => radios.map((radio) => (radio as HTMLInputElement).value));
  expect(new Set(values).size).toBe(3);
  expect(values).toContain("truthful");
  expect(values).toContain("validation");
});

test("records the choice and lets them through", async ({ page }) => {
  await page.goto("/app/person-marta/setup");
  await page.getByRole("radio", { name: /Tell them the truth/ }).check();
  await page.getByRole("button", { name: "Save and continue", exact: true }).click();

  await expect(page).toHaveURL(/\/app\/person-marta$/);
  await expect(page.getByRole("heading", { name: "What to say about hard questions" })).toBeVisible();
});

test("does not ask again once they have decided", async ({ page }) => {
  await page.goto("/app/person-marta/setup");
  await page.getByRole("radio", { name: /Move gently past it/ }).check();
  await page.getByRole("button", { name: "Save and continue", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/person-marta$/);

  // Gentle redirection is also what the engine falls back to when nothing is
  // set, so this is the case where a naive check would mistake a real decision
  // for an absent one and make the family answer the same question forever.
  await page.goto("/app/person-marta");
  await expect(page).toHaveURL(/\/app\/person-marta$/);

  await page.goto("/app/person-marta/setup");
  await expect(page).toHaveURL(/\/app\/person-marta$/);
});

test("says what it will never do, whatever they choose", async ({ page }) => {
  await page.goto("/app/person-marta/setup");

  // The reassurance a buyer needs before answering, and the first question
  // every one of them asks. personas/anna-venter.md.
  const setup = page.getByTestId("setup");
  await expect(setup).toContainText(/never raise a death on its own/i);
  await expect(setup).toContainText(/change this later/i);
});

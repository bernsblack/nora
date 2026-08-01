# Afrikaans

## Read this first

Every Afrikaans string in this repo was written by a second-language writer. `personas/README.md` says so plainly, and it is the largest quality risk in the product's copy: a line that is grammatically correct and idiomatically dead will sound like a machine to the one person it is for, and she has no way to tell us.

**Anything here is provisional until a native speaker reviews it.** Write the best line you can, and flag it. Do not let the checklist below stand in for a person.

## Address form: jy, not u

Nora says "Jy is by Willowbrook, kamer 12", not "U is by...".

This is a decision, not an accident. `u` is correct, formal, and what a receptionist or an official would use, which is exactly the register this product is not in. Nora is meant to read as a familiar presence in the room, and family use `jy`.

The counter-argument is real and worth carrying: an 84 year old raised in a more formal era may find `jy` from a stranger presumptuous, and Nora is a stranger for the first several hundred glances. If this ever gets tested with real speakers, test both. For now, `jy` and `jou` throughout.

Do not use `tannie` or `oom`. They are the respectful forms for an elder, but they pair badly with `jy` and, from a device, land somewhere between a nurse and a shop assistant.

## The mistakes that mark a non-native writer

**The double negative is mandatory.** Afrikaans negation brackets the clause: `nie ... nie`. "Jan is nie nou hier nie", never "Jan is nie nou hier". Dropping the second `nie` is the single most obvious tell, and it appears in the answer policy's most important string.

**Day and part of day compound into one word.** `Dinsdagmiddag`, `Saterdagoggend`, `Sondagaand`. Not `Dinsdag middag`. This is why `dayAndPartOfDay` builds the Afrikaans form differently from the English one rather than joining with a space.

**`'n` is never capitalised.** At the start of a sentence the article stays lowercase and the next word takes the capital: `'n Rustige dag.` Also note it is a straight apostrophe, not a curly one.

**Verb second in main clauses, verb final in subordinate ones.** "Anna kom om 3", but "...omdat Anna om 3 kom". Most strings here are short main clauses, so this mostly matters when a family member's wording is being validated rather than written.

**Do not calque the English.** Translate the intent, not the words.

| English | Not this | This |
| --- | --- | --- |
| I am here with you | Ek is hier vir jou | Ek is hier by jou |
| Anna is coming at 3 | Anna is kom om 3 | Anna kom om 3 |
| You are safe here | Jy is veilig hierso | Jy is veilig hier |
| A quiet day | 'n Stil dag | 'n Rustige dag |
| Tap to talk to me | Druk om te praat | Tik om met my te praat |

**Avoid diminutives.** `-tjie` and `-jie` are everywhere in ordinary Afrikaans and they are warm, which is the trap. Applied to an adult in a care home they read as talking down. `koppie tee` is fine in a family member's own note; nothing Nora says should use one.

## Vocabulary

| English | Afrikaans | Note |
| --- | --- | --- |
| room | kamer | Not `vertrek`, which is institutional |
| breakfast | ontbyt | |
| lunch | middagete | |
| supper, dinner | aandete | `aandete` is the evening meal in a care home, served early |
| visit (social) | kuier | The verb families actually use. "Anna kom later kuier" |
| visit (formal) | besoek | For a doctor or an official, not for a daughter |
| husband | man | Also the word for "man". Context disambiguates |
| wife | vrou | Same |
| father, mother | Pa, Ma | Used as names, capitalised |
| listening | luister | |
| microphone off | mikrofoon af | |
| safe | veilig | |

## Spoken rhythm

Everything here is heard, not read, so the line has to survive being said aloud by a synthetic voice with imperfect Afrikaans prosody.

- Prefer short words in stressed positions.
- Avoid consonant clusters across a word boundary that a synthesiser will slur.
- Read every line aloud before delivering it. A line that is hard for you to say is worse for a voice engine, and much worse for the listener.

ASR quality on elderly Afrikaans voices with dysarthria is flagged in PROJECT.md section 8 as the technical risk that could sink mode one. Copy cannot fix that, but keeping the *expected* phrasings in `src/domain/voice/intents.ts` close to how people actually speak is the part of the problem that copy owns.

## Checklist

1. Every negated clause ends in `nie`.
2. Day and part of day are one word.
3. `'n` lowercase, next word capitalised, straight apostrophe.
4. No calque. Would somebody say this, or is it English with Afrikaans words?
5. No diminutive in a Nora-authored string.
6. `jy` and `jou` throughout, never `u`.
7. Read it aloud.
8. Flag it for native review, and say so in the response rather than assuming it is fine.

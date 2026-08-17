# TAMU PHONE

Meet TAMU, a blunt smug cat that lives inside a phone. You can always rely on him to help
you bend the rules (●'◡'●).

![Calling TAMU as OMORI](https://raw.githubusercontent.com/issaloubani/tamu-phone/main/screenshots/01-calling-omori.png)

## What the hell is this

Call TAMU if you need to bend the rules just a tiny bit ヾ(•ω•`)o.

He can help you with:

- **Patching everyone up.** Full HEART, full JUICE, everyone, instantly. No, he will not
  explain how.
- **Setting HEART and JUICE to a number.** 100 up to 999, for everyone at once. He raises
  the ceiling first, because otherwise the game quietly caps you at whatever you already
  had. There is an option to put the limits back when you are done.
- **Party management.** Add someone, send someone home. He only offers people who belong in
  the world you are currently standing in, because the alternative crashes the game and he
  is not doing that to you.
- **Items.** Any item in the game, handed over 1, 10 or 99 at a time. Yes, any of them.
- **CLAMS.** A thousand at a time. Spend them on something silly.
- **How you walk.** Faster, slower, or straight through the scenery.
- **The phone itself.** He will give you the TAMU PHONE. Over the phone. He knows.

He also answers differently depending on who is holding the phone, so tag with **A** and
call him again. OMORI gets a very different conversation than HERO does （*゜ー゜*）.

![Adjusting how you walk](https://raw.githubusercontent.com/issaloubani/tamu-phone/main/screenshots/04-how-i-walk.png)

The whole thing, if you would rather see it at once:

```
TAMU
├─ THE PARTY
│  ├─ PATCH EVERYONE UP         full HEART and JUICE
│  ├─ SET THEIR NUMBERS
│  │  ├─ HEART                  100 up to 999
│  │  ├─ JUICE                  100 up to 999
│  │  └─ PUT THEIR LIMITS BACK
│  ├─ ADD SOMEONE               this world's cast only
│  └─ SEND SOMEONE HOME
├─ ITEMS AND CLAMS
│  ├─ CHANGE THAT               1, 10 or 99 at a time
│  ├─ GIVE ME SOMETHING         every item in the game
│  ├─ GIVE ME CLAMS             1000 a go
│  └─ THE PHONE ITSELF
└─ HOW I WALK
   ├─ FASTER / SLOWER
   └─ WALK THROUGH WALLS
```

## How to call him

Press **J** on the map.

That is it. There is also a TAMU PHONE key item that does the same thing, in case you want
to feel like you earned it, but the hotkey works from the start.

If **J** does nothing, it is bound elsewhere on your setup. Change one number at the top of
`plugins/tamu_phone.js`, the free keys are listed right there in the comment.

First time you call on a save, he introduces himself. After that he gets straight to the
point, like a normal person. Cat. Whatever he is.

![The phone ringing and TAMU picking up](https://raw.githubusercontent.com/issaloubani/tamu-phone/main/screenshots/02-first-call.png)

![TAMU explaining himself](https://raw.githubusercontent.com/issaloubani/tamu-phone/main/screenshots/03-intro.png)

## Use a save slot you do not care about

Obvious, but saying it anyway: these are cheats and they go into your save file.

**SET THEIR NUMBERS** is the one to watch. Raising HEART and JUICE past their cap is a real
stat change written onto the actor, not a temporary buff, so it survives saving, loading and
closing the game. **PUT THEIR LIMITS BACK** undoes it exactly, but only if you remember to.

TAMU will not stop you. He does not really see the problem （*゜ー゜*）.

## Install

You need [OneLoader](https://github.com/rphsoftware/OneLoader).

Drop the `tamuphone` folder into `www/mods/` and launch the game. That is the whole install.
Nothing is written into the game's own files, so deleting the folder puts everything back
exactly how it was.

> If your copy of OMORI is decrypted rather than the Steam version, you will need a build of
> OneLoader that supports plaintext installs. Stock 1.5 assumes Steam and will not load
> this. Do not ask how I know （｀へ´）.

**Issa:** ASK. ME. I wrote the patch that makes non-Steam and decrypted copies work with
OneLoader. Thank me later (✿◡‿◡)

> ... you can just do that? What the hell (。_。)

## Inspiration

TAMU can answer that for you:

> ... My creator issa, he created me since he likes to bend the rules, so ask him not me
> ㄟ( ▔, ▔ )ㄏ

**Issa:** 👀

> ... He is still staring at me. He does that. I live in a phone, I cannot exactly walk
> away from it. Ask him.

## If something breaks

TAMU claims item ID **995** and common event **1995**. If another mod wants those, you will
get a loud error naming this mod rather than a silently broken save, because both data
patches check the slot is empty before touching it. That is on purpose.

Anything else, check `latest.log` in your game folder. It names every mod, every patch and
every plugin, and it is far more useful than the error box the game shows you.

## What's next?

> If anyone needs an update, just reach issa, not me. I am a readme here （*゜ー゜*）.

**Issa:** I am thinking about a battle option. Make TAMU useful in a fight as well (￣▽￣)

> (⊙_⊙)？

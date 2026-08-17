/*
 * TAMU PHONE
 *
 * A cheat menu rendered entirely through OMORI's own message and choice windows.
 * There is no custom UI here: every screen is a normal $gameMessage with a face and a
 * normal Window_ChoiceList. That is what makes it feel native, and it is also far less
 * code than drawing our own windows would be.
 *
 * Opened with F9, or by using the TAMU PHONE key item, which runs common event 1995,
 * which calls $tamuPhone.call().
 */

{
    const FACE_NAME = "TAMU";

    // Faces are a grid of 106x106 cells, 4 per row, indexed row * 4 + column.
    // These must match the order the images were passed to tools/build_tamu_face.js.
    // Sources live in art/, the sheet is rebuilt from them, see tools/ART_PROMPT.md.
    const FACE = {
        NEUTRAL:   0,
        PLEASED:   1,
        SMUG:      2,
        ANNOYED:   3,
        SLEEPY:    4,
        FLAT:      5,
        SURPRISED: 6
    };

    /*
     * Key that opens the phone. Change this one number to rebind.
     *
     * Already taken, do not use:
     *   9 tab, 13 enter, 16 shift, 17 ctrl, 18 alt, 27 esc, 32 space, 33/34 pgup/pgdn,
     *   37-40 arrows, 45 insert, 65 A (map tag), 81 Q, 87 W, 88 X, 90 Z, 96/98/100/102/104
     *   numpad, 113 F2, 114 F3, 115 F4, 116 F5, 120 F9 (stock MV debug window), 123 F12.
     *
     * Free and safe: 74 J, 75 K, 76 L, 71 G, 72 H, 77 M, 78 N, 66 B, 67 C, 86 V, 80 P,
     *   84 T, 121 F10, 122 F11.
     *
     * One caveat for letters: the in-game options screen lets the player rebind controls,
     * and it writes straight into Input.keyMapper. If someone binds a movement key onto
     * this one, the phone hotkey stops responding until it is changed here. The item still
     * works either way.
     */
    /*
     * Played while the phone is ringing. Other phone-shaped sounds that ship with the
     * game, if this one does not fit: SE_phone_dial, BA_do_nothing_dialtone, SE_dial_up,
     * GEN_call_for_friend, SE_BELL_CC0_thaighaudio.
     *
     * No extension: AudioManager picks .ogg or .rpgmvo depending on the install, so this
     * works on an encrypted copy too.
     */
    const RING_SE = "BA_call_for_help_phone";

    const HOTKEY = 74; // J, right under your resting hand

    const ACTION = "tamuphone";

    /*
     * Binding the key once at load is not enough.
     *
     * ConfigManager.applyData does `Input.keyMapper = config.keyboardInputMap`
     * (Omori BASE.js:683), replacing the whole object with the player's saved settings.
     * That runs from Scene_Boot, well after plugins have loaded, so anything a plugin
     * added to the map is simply discarded. Reinstall after every applyData instead.
     */
    function installHotkey() {
        if (!Input.keyMapper) return;

        const existing = Input.keyMapper[HOTKEY];
        if (existing && existing !== ACTION) {
            console.warn(
                `[tamuphone] key ${HOTKEY} is already bound to "${existing}". ` +
                `Phone hotkey disabled. Use the TAMU PHONE item, or pick a free key.`
            );
            return;
        }
        Input.keyMapper[HOTKEY] = ACTION;
        if (window._logLine) window._logLine(`[tamuphone] hotkey bound to key ${HOTKEY}`);
    }

    installHotkey();

    const _tamu_ConfigManager_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function (config) {
        _tamu_ConfigManager_applyData.call(this, config);
        installHotkey();
    };

    /*
     * The other half: makeData stores Input.keyMapper by reference (Omori BASE.js:639),
     * so our binding would be written into the player's saved config and stay there even
     * after the mod is removed. Persist a copy without it and leave no trace.
     */
    const _tamu_ConfigManager_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function () {
        const config = _tamu_ConfigManager_makeData.call(this);
        if (config && config.keyboardInputMap) {
            const clean = Object.assign({}, config.keyboardInputMap);
            delete clean[HOTKEY];
            config.keyboardInputMap = clean;
        }
        return config;
    };

    // Actors worth offering. 1-4 are the headspace party, 8-11 the real world one.
    // Slots 5, 6, 7, 12 and 13 exist but are unnamed placeholders and will produce a
    // party member with no sprite and no battler, so they are deliberately excluded.
    /*
     * The cast exists twice and the two halves are not interchangeable. 1-4 are the
     * headspace versions, 8-11 are the same people in Faraway Town. Putting a Faraway
     * actor into a headspace party crashes with "Cannot set property 'x' of undefined"
     * while the map builds follower sprites for someone the scene was never set up for.
     *
     * Switch 7 is named "Dream / Faraway Toggle" and looks like the obvious flag to read,
     * but exactly one map ever turns it on and nothing ever turns it off, so it does not
     * track the world at all. Deriving the world from who is already standing there is
     * self-consistent and assumes nothing about game state.
     */
    const HEADSPACE_IDS = [1, 2, 3, 4];
    const FARAWAY_IDS = [8, 9, 10, 11];

    /* The half of the cast the current party belongs to. */
    function currentCast() {
        const ids = $gameParty.members().map(a => a.actorId());
        if (ids.some(id => FARAWAY_IDS.includes(id))) return FARAWAY_IDS;
        if (ids.some(id => HEADSPACE_IDS.includes(id))) return HEADSPACE_IDS;
        return HEADSPACE_IDS.concat(FARAWAY_IDS); // empty or unrecognised party
    }

    const inHeadspace = () => currentCast() === HEADSPACE_IDS;

    /*
     * TAMU answers differently depending on who is holding the phone.
     *
     * Tagging with A swaps the party leader (Map_Character_Tag.js reserves a common event
     * that reorders the party), so $gameParty.leader() is whoever is currently in front.
     * Keyed by actor id: 1-4 are the headspace cast, 8-11 the same people in the real
     * world, and they do not get the same lines.
     *
     * Keep each block to three lines or fewer, that is what fits the message box.
     */
    const VOICE = {
        1:  { greet: ["...", "OMORI. Still not talking.", "Fine by me. What do you need?"],
              greetFace: FACE.FLAT,
              bye: ["...", "Yeah. Bye."], byeFace: FACE.FLAT },
        2:  { greet: ["AUBREY. You do not have to shout,", "the phone works."],
              greetFace: FACE.ANNOYED,
              bye: ["Go hit something. Not the phone."], byeFace: FACE.NEUTRAL },
        3:  { greet: ["KEL! Slow down.", "I have not said anything yet."],
              greetFace: FACE.ANNOYED,
              bye: ["Go bounce somewhere else."], byeFace: FACE.NEUTRAL },
        4:  { greet: ["Oh, HERO. Someone polite for once.", "What do you need?"],
              greetFace: FACE.PLEASED,
              bye: ["Take care of them, would you?"], byeFace: FACE.PLEASED },

        8:  { greet: ["SUNNY.", "You are quiet even on the phone.", "What do you need?"],
              greetFace: FACE.NEUTRAL,
              bye: ["...alright. Talk later."], byeFace: FACE.SLEEPY },
        9:  { greet: ["AUBREY.", "You sound tired. What do you need?"],
              greetFace: FACE.NEUTRAL,
              bye: ["Try to sleep."], byeFace: FACE.SLEEPY },
        10: { greet: ["KEL. Of course it is you.", "What do you need?"],
              greetFace: FACE.SMUG,
              bye: ["Say hi to the basketball."], byeFace: FACE.PLEASED },
        11: { greet: ["HERO. How is the cooking going?", "What do you need?"],
              greetFace: FACE.PLEASED,
              bye: ["Eat something. You never do."], byeFace: FACE.NEUTRAL }
    };

    const DEFAULT_VOICE = {
        greet: ["Hey. TAMU here.", "What do you need?"], greetFace: FACE.NEUTRAL,
        bye:   ["Call me whenever."],                    byeFace: FACE.NEUTRAL
    };

    /* Lines for whoever is currently leading the party. */
    function voice() {
        const leader = $gameParty.leader();
        const id = leader ? leader.actorId() : 0;
        return VOICE[id] || DEFAULT_VOICE;
    }

    const AMOUNTS = [1, 10, 99];

    const state = {
        amountIndex: 1,
        inCall: false,
        greeted: false
    };

    const amount = () => AMOUNTS[state.amountIndex];

    // ------------------------------------------------------------------------
    // Conversation driver
    //
    // A choice callback fires while the message system is still tearing the current
    // message down, so we cannot open the next screen from inside it. Instead we park a
    // function and run it from Scene_Map.update once $gameMessage has gone quiet.
    // ------------------------------------------------------------------------

    let pending = null;

    function later(fn) {
        pending = fn;
    }

    function driverUpdate() {
        if (!pending) return;
        if ($gameMessage.isBusy()) return;
        if (!(SceneManager._scene instanceof Scene_Map)) return;

        const scene = SceneManager._scene;
        // Wait for the window to finish closing too, otherwise the next face pops in
        // over the tail of the previous one.
        if (scene._messageWindow && scene._messageWindow.isClosing()) return;

        const fn = pending;
        pending = null;
        fn();
    }

    /*
     * Show text with no choices, then continue.
     * Pass face: null for a box with no portrait, which is what the ringing uses, since
     * TAMU has not picked up yet.
     */
    function say(lines, then, face) {
        if (face === null) {
            $gameMessage.setFaceImage("", 0);
        } else {
            $gameMessage.setFaceImage(FACE_NAME, face === undefined ? FACE.NEUTRAL : face);
        }
        for (const line of lines) $gameMessage.add(line);
        if (then) later(then);
    }

    /*
     * A block of dialogue is either bare lines, or lines with an expression:
     *
     *   ["one", "two"]                        -> whatever face the caller defaults to
     *   { lines: ["one"], face: FACE.SMUG }   -> a specific one
     *
     * Everything that shows text accepts both, so putting an expression on an existing
     * line never means restructuring the code around it.
     */
    function block(value) {
        if (!value) return null;
        if (Array.isArray(value)) return { lines: value, face: undefined };
        return { lines: value.lines || [], face: value.face };
    }

    /* Show several boxes back to back, then continue. */
    function sequence(blocks, then, face) {
        let i = 0;
        const next = () => {
            if (i >= blocks.length) return then && then();
            const b = block(blocks[i++]);
            say(b.lines, next, b.face !== undefined ? b.face : face);
        };
        next();
    }

    /*
     * Whether this save has met TAMU. Stored on $gameSystem because that object is
     * serialized into the save file, so it survives reloading and is per save slot: a new
     * game meets him again, which is the correct behaviour for a character introduction.
     */
    const hasMetTamu = () => !!($gameSystem && $gameSystem._tamuPhoneMet);

    const INTRO = [
        { lines: ["...oh.", "Someone actually picked up the other end."],
          face: FACE.SURPRISED },
        { lines: ["I am TAMU.", "I live inside this phone.",
                  "Do not ask how. I already checked."] },
        { lines: ["I can bend a few things for you.", "Not the important ones. The other ones.",
                  "You have my number now."],
          face: FACE.SMUG }
    ];

    /* The call connecting: dial tone, no face, then TAMU answers. */
    function ring() {
        AudioManager.playSe({ name: RING_SE, volume: 90, pitch: 100, pan: 0 });

        say(["Ringing...", "Ringing......"], () => {
            if (hasMetTamu()) return open("root");

            if ($gameSystem) $gameSystem._tamuPhoneMet = true;
            // He introduces himself first, then greets whoever is actually holding the
            // phone, so the first call ends up in the same place every other call starts.
            sequence(INTRO, () => open("root"));
        }, null);
    }

    // ------------------------------------------------------------------------
    // Screens
    // ------------------------------------------------------------------------

    const SCREENS = {};

    /*
     * text:    () => array of lines, evaluated fresh so live values show
     * options: () => array of { label, to } or { label, run }
     *
     * `run` may return an array of lines for TAMU to say before returning to the screen,
     * or nothing to return silently.
     */
    function screen(id, def) {
        SCREENS[id] = def;
    }

    function open(id) {
        const def = SCREENS[id];
        if (!def) {
            hangUp();
            return;
        }

        const options = def.options();

        // face may be a plain index or a function, so a screen can react to game state.
        // Resolved before text(), because text() is allowed to mutate state: root's
        // greeting flips state.greeted, and the face has to be read before that happens.
        const face = typeof def.face === "function" ? def.face() : def.face;
        $gameMessage.setFaceImage(FACE_NAME, face !== undefined ? face : FACE.NEUTRAL);
        for (const line of def.text()) $gameMessage.add(line);

        // Cancel maps to the last option, which is always BACK or HANG UP. That way ESC
        // behaves the way it does everywhere else in the game.
        $gameMessage.setChoices(options.map(o => o.label), 0, options.length - 1);
        $gameMessage.setChoiceCallback(function (n) {
            const choice = options[n];
            later(function () {
                if (!choice) return hangUp();
                if (choice.to) return open(choice.to);
                if (choice.run) {
                    const reply = block(choice.run());

                    // An action is allowed to end the call. Check inCall rather than
                    // reopening blindly, otherwise hanging up just reopens the screen you
                    // were trying to leave. Done after the reply so a goodbye still shows.
                    const resume = () => { if (state.inCall) open(choice.back || id); };

                    if (reply && reply.lines.length) return say(reply.lines, resume, reply.face);
                    return resume();
                }
                hangUp();
            });
        });
    }

    function hangUp() {
        state.inCall = false;
        pending = null;
    }

    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------

    const party = () => $gameParty.members();

    /* Items with a name that is not a section marker or an unfinished placeholder. */
    function realItems() {
        return $dataItems.filter(it =>
            it && it.name && it.name.trim() &&
            !it.name.startsWith("-") &&
            !it.name.startsWith("/") &&
            !it.name.startsWith("{")
        );
    }

    /* Build a paged option list out of a long array. selfScreen is the screen being paged. */
    function paged(list, page, perPage, makeOption, backTo, selfScreen) {
        const start = page * perPage;
        const slice = list.slice(start, start + perPage);
        const options = slice.map(makeOption);

        if (start + perPage < list.length) {
            options.push({ label: "MORE...", run: () => { state.page = page + 1; return null; }, back: selfScreen });
        }
        if (page > 0) {
            options.push({ label: "BACK A PAGE", run: () => { state.page = page - 1; return null; }, back: selfScreen });
        }
        options.push({ label: "NEVER MIND", to: backTo });
        return options;
    }

    /*
     * Values offered for HEART and JUICE.
     *
     * Setting these is not just setHp: refresh() clamps _hp to mhp (rpg_objects.js:2651),
     * so asking for 999 on an actor whose max is 47 silently gives you 47. The maximum has
     * to be raised first, via addParam, which writes into _paramPlus and is saved with the
     * actor. That is a real, persistent stat change, which is why there is an option to put
     * it back.
     */
    const STAT_VALUES = [100, 200, 300, 400, 500, 600, 700, 800, 900, 999];

    const PARAM = { HP: 0, MP: 1 };

    function setStat(paramId, value) {
        party().forEach(a => {
            const cap = a.param(paramId);
            if (value > cap) a.addParam(paramId, value - cap);
            if (paramId === PARAM.HP) a.setHp(value);
            else a.setMp(value);
        });
    }

    /* Undo every raise this menu made, using the public API rather than poking _paramPlus. */
    function restoreLimits() {
        party().forEach(a => {
            a.addParam(PARAM.HP, -a.paramPlus(PARAM.HP));
            a.addParam(PARAM.MP, -a.paramPlus(PARAM.MP));
            a.setHp(Math.min(a.hp, a.mhp));
            a.setMp(Math.min(a.mp, a.mmp));
        });
    }

    // ------------------------------------------------------------------------
    // The menu
    // ------------------------------------------------------------------------

    screen("root", {
        // The pickup wears whoever-is-leading's expression. Coming back from a submenu is
        // not a pickup, so it drops to neutral.
        face: () => state.greeted ? FACE.NEUTRAL : voice().greetFace,
        // Greet once per call. Coming back from a submenu should not replay the pickup.
        text: () => {
            if (state.greeted) return ["Anything else?"];
            state.greeted = true;
            return voice().greet;
        },
        options: () => [
            { label: "THE PARTY", to: "party" },
            { label: "ITEMS AND CLAMS", to: "items" },
            { label: "HOW I WALK", to: "player" },
            {
                label: "NOTHING, SORRY",
                run: () => {
                    const v = voice();
                    hangUp();
                    return { lines: v.bye, face: v.byeFace };
                }
            }
        ]
    });

    // --- party ---------------------------------------------------------------

    screen("party", {
        text: () => {
            const lines = party().map(a => `${a.name()}   ${a.hp}/${a.mhp} HEART   ${a.mp}/${a.mmp} JUICE`);
            return lines.length ? lines : ["There is nobody with you right now."];
        },
        options: () => [
            {
                label: "PATCH EVERYONE UP",
                run: () => {
                    // setHp triggers refresh, which drops the death state on its own, so
                    // this also covers a downed actor without needing a separate revive.
                    party().forEach(a => { a.setHp(a.mhp); a.setMp(a.mmp); });
                    return { lines: ["Full HEART, full JUICE.", "Try to keep it that way."], face: FACE.SMUG };
                }
            },
            {
                /*
                 * There is deliberately no "revive" option. Scene_Battle.terminate in
                 * GTP_OmoriFixes.js:1896 removes state 1 and revives every party member on
                 * the way out of every battle, so UNCONSCIOUS cannot exist on the map, and
                 * the map is the only place this phone opens. It would be a button that
                 * could never do anything.
                 *
                 * States are the thing that actually survives a battle. STRESSED OUT is the
                 * one players will hit; the rest of the emotion states clear themselves.
                 */
                label: "CLEAR STATUS EFFECTS",
                run: () => {
                    const afflicted = party().filter(a => a.states().length > 0);
                    if (!afflicted.length) {
                        return { lines: ["Nobody has anything on them."], face: FACE.FLAT };
                    }
                    const names = Array.from(new Set(
                        afflicted.reduce((all, a) => all.concat(a.states().map(s => s.name)), [])
                    ));
                    afflicted.forEach(a => { a.clearStates(); a.refresh(); });
                    return { lines: [`Gone: ${names.join(", ")}.`], face: FACE.SMUG };
                }
            },
            { label: "SET THEIR NUMBERS", to: "stats" },
            { label: "ADD SOMEONE", to: "party_add" },
            { label: "SEND SOMEONE HOME", to: "party_remove" },
            { label: "BACK", to: "root" }
        ]
    });

    screen("stats", {
        text: () => {
            const raised = party().filter(a => a.paramPlus(PARAM.HP) || a.paramPlus(PARAM.MP));
            return raised.length
                ? ["Which one?", `I have already raised the ceiling on ${raised.length} of them.`]
                : ["Which one?", "I can push these past what they should hold."];
        },
        options: () => [
            { label: "HEART", run: () => { state.page = 0; return null; }, back: "set_hp" },
            { label: "JUICE", run: () => { state.page = 0; return null; }, back: "set_mp" },
            {
                label: "PUT THEIR LIMITS BACK",
                run: () => {
                    const raised = party().filter(a => a.paramPlus(PARAM.HP) || a.paramPlus(PARAM.MP));
                    if (!raised.length) {
                        return { lines: ["I have not touched their limits."], face: FACE.FLAT };
                    }
                    restoreLimits();
                    return { lines: ["Back to whatever they were born with."], face: FACE.NEUTRAL };
                }
            },
            { label: "BACK", to: "party" }
        ]
    });

    screen("set_hp", {
        text: () => [`HEART for everyone. Currently ${party().map(a => a.mhp).join(", ")}.`],
        options: () => paged(STAT_VALUES, state.page, 6, v => ({
            label: String(v),
            run: () => {
                setStat(PARAM.HP, v);
                return { lines: [`${v} HEART each. Do not get comfortable.`], face: FACE.SMUG };
            },
            back: "set_hp"
        }), "stats", "set_hp")
    });

    screen("set_mp", {
        text: () => [`JUICE for everyone. Currently ${party().map(a => a.mmp).join(", ")}.`],
        options: () => paged(STAT_VALUES, state.page, 6, v => ({
            label: String(v),
            run: () => {
                setStat(PARAM.MP, v);
                return { lines: [`${v} JUICE each. Go be ridiculous.`], face: FACE.SMUG };
            },
            back: "set_mp"
        }), "stats", "set_mp")
    });

    screen("party_add", {
        text: () => inHeadspace()
            ? ["Who should I call over?", "Only the ones who belong in here."]
            : ["Who should I call over?", "Only the ones who are actually awake."],
        options: () => {
            // Offer the current world's cast only. The other half of the cast exists, but
            // dragging them across worlds crashes the map, so they are simply not listed.
            const available = currentCast()
                .map(id => $gameActors.actor(id))
                .filter(a => a && a.name() && a.name().trim() && !$gameParty.members().includes(a));

            if (!available.length) {
                return [{ label: "BACK", to: "party" }];
            }
            return available.map(a => ({
                label: `${a.name()} (${a.actorId()})`,
                run: () => {
                    $gameParty.addActor(a.actorId());
                    return { lines: [`${a.name()} is with you now.`], face: FACE.PLEASED };
                },
                back: "party"
            })).concat([{ label: "NEVER MIND", to: "party" }]);
        }
    });

    screen("party_remove", {
        text: () => ["Who should sit this one out?"],
        options: () => {
            const members = party();
            if (members.length <= 1) {
                return [
                    { label: "BACK", to: "party" }
                ];
            }
            return members.map(a => ({
                label: a.name(),
                run: () => {
                    $gameParty.removeActor(a.actorId());
                    return [`${a.name()} headed off.`];
                },
                back: "party"
            })).concat([{ label: "NEVER MIND", to: "party" }]);
        }
    });

    // --- items ---------------------------------------------------------------

    screen("items", {
        text: () => [
            `You have ${$gameParty.gold()} ${TextManager.currencyUnit.trim()}.`,
            `I am handing things out ${amount()} at a time.`
        ],
        options: () => [
            {
                label: `CHANGE THAT (${amount()})`,
                run: () => {
                    state.amountIndex = (state.amountIndex + 1) % AMOUNTS.length;
                    return null;
                }
            },
            { label: "GIVE ME SOMETHING", run: () => { state.page = 0; return null; }, back: "items_list" },
            {
                label: "GIVE ME CLAMS",
                run: () => {
                    $gameParty.gainGold(1000);
                    return {
                        lines: [`1000 ${TextManager.currencyUnit.trim()}. Spend it on something silly.`],
                        face: FACE.SMUG
                    };
                }
            },
            {
                label: "THE PHONE ITSELF",
                run: () => {
                    if ($gameParty.hasItem($dataItems[995])) {
                        return {
                            lines: ["You are holding it. We are talking on it."],
                            face: FACE.FLAT
                        };
                    }
                    $gameParty.gainItem($dataItems[995], 1);
                    return {
                        lines: ["Now it is in your bag too.", "Do not think about it too hard."],
                        face: FACE.SURPRISED
                    };
                }
            },
            { label: "BACK", to: "root" }
        ]
    });

    state.page = 0;

    screen("items_list", {
        text: () => {
            const list = realItems();
            const pages = Math.ceil(list.length / 6);
            return [`Page ${state.page + 1} of ${pages}. Taking ${amount()} at a time.`];
        },
        options: () => paged(
            realItems(),
            state.page,
            6,
            it => ({
                label: it.name,
                run: () => {
                    $gameParty.gainItem(it, amount());
                    return { lines: [`${amount()}x ${it.name}. Enjoy.`], face: FACE.SMUG };
                },
                back: "items_list"
            }),
            "items",
            "items_list"
        )
    });

    // --- player --------------------------------------------------------------

    screen("player", {
        text: () => [
            `Walk speed is ${$gamePlayer.moveSpeed()}.`,
            $gamePlayer.isThrough() ? "Walls are currently a suggestion." : "Walls are currently walls."
        ],
        options: () => [
            {
                label: "FASTER",
                run: () => {
                    $gamePlayer.setMoveSpeed(Math.min(6, $gamePlayer.moveSpeed() + 1));
                    return null;
                }
            },
            {
                label: "SLOWER",
                run: () => {
                    $gamePlayer.setMoveSpeed(Math.max(1, $gamePlayer.moveSpeed() - 1));
                    return null;
                }
            },
            {
                label: "WALK THROUGH WALLS",
                run: () => {
                    const on = !$gamePlayer.isThrough();
                    $gamePlayer.setThrough(on);
                    return on
                        ? { lines: ["Go on then. Do not get stuck in the scenery."], face: FACE.SMUG }
                        : { lines: ["Back to obeying the level design."], face: FACE.NEUTRAL };
                }
            },
            { label: "BACK", to: "root" }
        ]
    });

    // ------------------------------------------------------------------------
    // Entry point
    // ------------------------------------------------------------------------

    window.$tamuPhone = {
        call() {
            if (state.inCall) return;
            state.inCall = true;
            state.page = 0;
            state.greeted = false;
            later(ring);
        },
        /*
         * Make this save forget it ever met him, so the next call replays the intro.
         * Handy while writing the introduction, since otherwise you only get one look at
         * it per save file.
         */
        forget() {
            if ($gameSystem) $gameSystem._tamuPhoneMet = false;
        },

        /* Exposed so you can poke at it from the console while building. */
        screens: SCREENS,
        state
    };

    function canOpen() {
        return SceneManager._scene instanceof Scene_Map &&
            !$gameMessage.isBusy() &&
            !$gameMap.isEventRunning() &&
            !state.inCall;
    }

    const _tamu_Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _tamu_Scene_Map_update.call(this);

        if (Input.isTriggered("tamuphone") && canOpen()) {
            $tamuPhone.call();
        }
        driverUpdate();
    };
}

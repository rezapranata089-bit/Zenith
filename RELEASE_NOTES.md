## Zenith 16.1.0

### New features
- **Automix:** crossfades now run through a standby player, analyse the playback copy when the YouTube download fails, retry failed analyses, run a light analysis on hot phones, adapt the fade to quiet endings, and explain why a mix is waiting or failed in nerd stats.
- **Lyrics:** AI translation with a Gemini, Groq and OpenRouter fallback chain, model picker, and per-provider API key test. Translation language and AI translation are now one setting with drag-to-order. Long lyric strips scroll with edge fades.
- **Spotify Canvas:** Zenith is now the first canvas provider by default, with a provider order dialog to change it.
- **Audio quality:** YouTube Premium audio toggle (~256 kbps Opus), a frosted quality card that grows out of the badge, a tappable measured Dolby Atmos chip, and a tappable JioSaavn badge.
- **Lossless and cache:** quality badges, counts and filters on Downloads and Cache, FLAC and DSD detection for local files, lossless and Dolby cache entries protected from eviction, and complete cache entries can be copied into downloads.
- **Pages:** redesigned Charts, New releases (hero cards, scrollable 2-row grid, video row, animated cover clips) and Moods pages, plus a new About page with a bento grid and per-version commit timeline.
- **Library:** artist and album sort in playlist and album song lists, multi-artist credits split so each artist appears once, and a share button beside the more button on album pages.
- **Details:** album title logo from the signature API, tappable links in album and artist descriptions, and a star for popular tracks.
- **Player and app:** crash report screen with device and app diagnostics (localized), restart the track on back after 5 seconds, Zenith logo placeholder for covers, simplified account menu with a theme toggle and equalizer shortcut, and a credits section in About.
- **Glass:** new default glass preset, user-saved glass presets, and a specular rim with inner glow and sheen.

### Improvements
- Album play button, popular track star, swipe-to-queue reveal and action icons now follow the album logo or accent color.
- Smoother cover morphs, popup animations, panel rim fades and fluid card backgrounds, plus a transparent system navigation bar.
- Larger queue mode icons and new shuffle, repeat and autoplay glyphs.
- Lyrics share card shows the playing track quality badge and uses a darker canvas background for readability.

### Fixes
- **Playback:** fixed mixed-rendition and mixed-file cache corruption, wrong YouTube source labels for lossless and Dolby Atmos streams, skip crossfade waiting for the next track, and Automix with Direct Source Stream enabled.
- **Spotify:** full playlists now load on import, with a warning when a playlist is truncated.
- **Canvas:** fixed layout, aspect and blur glitches around the Spotify Canvas deck, queue drag and popups.
- **Lyrics:** fixed Arabic and cursive text in LiquidFlow, v1/v2 voice tags, wrong lyric lines in the share picker, and timestamped lyrics now take priority over unsynced ones.
- **Pages:** fixed clipped controls and transitions on album and artist pages, skeleton crashes, and shelves jumping while the feed loads.
- **Other:** fixed playlist sync downloading new likes when auto-download is off, and the player crash caused by a VerifyError.

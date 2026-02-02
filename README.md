# Head Start Lesson Plan Generator (iPhone-friendly PWA)

This is a simple offline-first web app you can use on iPhone (Add to Home Screen) to generate:
- Single Day plans OR Whole Week (Mon–Fri) plans
- 5 "I can" statements
- 5 Tewa vocab (3 words + 2 phrases) and 5 English vocab
- One book per day with 2 Before / 2 During / 2 After questions (with Tewa vocab embedded)
- Center plans for: Blocks, Art, Math, Dramatic Play, Library, Science/Sensory, Manipulative, Writing, Other

## Run locally (computer)
From the project folder:

python3 -m http.server 8000

Then open:
http://localhost:8000

## Host (recommended for iPhone)
Upload this folder to GitHub Pages or any simple web host.
On iPhone Safari:
- Open the site
- Share -> Add to Home Screen

## Notes
- Plans are stored in your browser's local storage (on the device).
- The app also stores a vocab history so it avoids repeating the same items.
- Use "Reset vocab history" if you want words to repeat again.


from PIL import Image, ImageDraw, ImageFont
import subprocess, os

PUBLIC = "/home/ubuntu/igcse-site/public"
FONT_PATH = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
BAR_HEIGHT, W, H = 50, 1280, 720

SEGMENTS = {
    "papers": {
        "frame": "frame_papers.png", "narration": "seg4_narration.wav",
        "output_clip": "clip_papers.mp4",
        "subtitle": "500+ 份笔记 · 10000+ 份历年真题 · 3000+ 套主题练习",
    },
    "questions": {
        "frame": "frame_questions.png", "narration": "seg3_narration.wav",
        "output_clip": "clip_questions.mp4",
        "subtitle": "海量题库，按主题分类——即时评分！手机在手，随时开练！",
    },
}

for seg_name, cfg in SEGMENTS.items():
    img = Image.open(os.path.join(PUBLIC, cfg["frame"])).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    bar_y = H - BAR_HEIGHT
    draw.rectangle([(0, bar_y), (W, H)], fill=(0, 0, 0, 180))
    for font_size in [28, 26, 24, 22, 20]:
        font = ImageFont.truetype(FONT_PATH, font_size)
        bbox = draw.textbbox((0, 0), cfg["subtitle"], font=font)
        tw = bbox[2] - bbox[0]
        if tw <= W - 40:
            break
    tx = (W - tw) // 2
    ty = bar_y + (BAR_HEIGHT - (bbox[3] - bbox[1])) // 2 - bbox[1]
    draw.text((tx, ty), cfg["subtitle"], font=font, fill=(255, 255, 255, 255))
    result = Image.alpha_composite(img, overlay)
    subtitled = os.path.join(PUBLIC, f"subtitled_{seg_name}.png")
    result.convert("RGB").save(subtitled, "PNG")
    audio = os.path.join(PUBLIC, cfg["narration"])
    dur = float(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", audio
    ]).decode().strip())
    clip = os.path.join(PUBLIC, cfg["output_clip"])
    subprocess.run([
        "ffmpeg", "-y", "-loop", "1", "-i", subtitled, "-i", audio,
        "-c:v", "libx264", "-tune", "stillimage",
        "-c:a", "aac", "-b:a", "128k", "-pix_fmt", "yuv420p",
        "-t", str(dur), "-shortest", clip
    ], check=True)
    size = os.path.getsize(clip)
    print(f"{seg_name}: {dur:.1f}s, {size/1024:.0f}KB ✓")

# Concatenate all 5 clips
clips = ["clip_home.mp4", "clip_subjects.mp4", "clip_questions.mp4", "clip_papers.mp4", "clip_end.mp4"]
concat_txt = os.path.join(PUBLIC, "concat.txt")
with open(concat_txt, "w") as f:
    for c in clips:
        f.write(f"file '{os.path.join(PUBLIC, c)}'\n")

output = os.path.join(PUBLIC, "promo-video.mp4")
# Re-encode for audio compatibility (not just -c copy)
subprocess.run([
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_txt,
    "-c:v", "libx264", "-c:a", "aac", "-b:a", "128k",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    output
], check=True)

dur = float(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", output
]).decode().strip())
print(f"\nFinal: {dur:.1f}s, {os.path.getsize(output)/1024:.0f}KB ✓")
os.remove(concat_txt)

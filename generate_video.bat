@echo off
echo === IGCSE Promo Video Generator ===
echo.

REM Check ffmpeg
where ffmpeg >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: ffmpeg not found. Install from https://ffmpeg.org/download.html
    pause
    exit /b 1
)

REM Download Chinese font
if not exist "NotoSansSC-Regular.otf" (
    echo Downloading Chinese font...
    curl -L -o NotoSansSC-Regular.otf "https://github.com/notofonts/noto-cjk/releases/download/Sans2.004/03_NotoSansCJKsc.zip" 2>nul
    echo If font download fails, manually download Noto Sans SC OTF and place as NotoSansSC-Regular.otf
)

REM Generate TTS audio using Edge TTS (built into Windows)
echo Generating TTS audio...
powershell -Command "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SetOutputToWaveFile('tts.wav'); $s.Speak('Master IGCSE, Achieve More. The most comprehensive IGCSE revision platform. Past papers, topic questions, and revision notes, all organized by subject and topic. Physics, Chemistry, Biology, Mathematics. Only 100 RMB per subject, or 500 RMB for all subjects. Start revising today!')"

REM Generate video
echo Generating video...
ffmpeg -y -f lavfi -i "color=c=0x001C71:s=720x406:d=42:r=24" -i tts.wav -filter_complex "drawtext=fontfile=NotoSansSC-Regular.otf:text='掌握IGCSE，成就更多':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2-40:enable='between(t,0,8)',drawtext=fontfile=NotoSansSC-Regular.otf:text='Master IGCSE, Achieve More':fontcolor=white@0.8:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+10:enable='between(t,0,8)',drawtext=fontfile=NotoSansSC-Regular.otf:text='历年真题·章节练习·复习笔记':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2-40:enable='between(t,8,18)',drawtext=fontfile=NotoSansSC-Regular.otf:text='Past Papers · Topic Questions · Notes':fontcolor=white@0.8:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+10:enable='between(t,8,18)',drawtext=fontfile=NotoSansSC-Regular.otf:text='按学科和主题分类':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2-40:enable='between(t,18,28)',drawtext=fontfile=NotoSansSC-Regular.otf:text='Organized by Subject and Topic':fontcolor=white@0.8:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+10:enable='between(t,18,28)',drawtext=fontfile=NotoSansSC-Regular.otf:text='物理·化学·生物·数学':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2-40:enable='between(t,28,36)',drawtext=fontfile=NotoSansSC-Regular.otf:text='Physics Chemistry Biology Math':fontcolor=white@0.8:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+10:enable='between(t,28,36)',drawtext=fontfile=NotoSansSC-Regular.otf:text='每科100元·全科500元':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2-40:enable='between(t,36,40)',drawtext=fontfile=NotoSansSC-Regular.otf:text='100 RMB/subject · 500 all':fontcolor=#FF8C00:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+10:enable='between(t,36,40)',drawtext=fontfile=NotoSansSC-Regular.otf:text='今天就开始复习！':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2-20:enable='between(t,40,42)',drawtext=fontfile=NotoSansSC-Regular.otf:text='Start Revising Today!':fontcolor=white@0.8:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+20:enable='between(t,40,42)'" -c:v libx264 -preset veryfast -pix_fmt yuv420p -c:a aac -b:a 64k -shortest -movflags +faststart promo-video.mp4

if %errorlevel% equ 0 (
    echo.
    echo === SUCCESS! ===
    echo Video: promo-video.mp4
    echo Place this in your project's public/ folder and push to GitHub.
) else (
    echo.
    echo === FAILED ===
    echo Check if font file exists and ffmpeg works.
)
pause

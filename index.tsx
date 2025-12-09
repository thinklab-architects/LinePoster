import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { createRoot } from 'react-dom/client';

// --- Types ---
type TextColorMode = 'light' | 'dark';
type BtnColorMode = 'orange' | 'blue' | 'green' | 'black';

interface ConfigState {
    tag: string;
    title: string;
    subtitle: string;
    date: string;
    time: string;
    location: string;
    ctaText: string;
    ctaUrl: string;
    textColorMode: TextColorMode;
    btnColorMode: BtnColorMode;
    bgImage: HTMLImageElement | null;
}

// --- Canvas Helpers ---

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split('');
    let lines: string[] = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        let word = words[i];
        let width = ctx.measureText(currentLine + word).width;
        if (width < maxWidth) {
            currentLine += word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: boolean) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
}

function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
    const imgRatio = img.width / img.height;
    const canvasRatio = w / h;
    let drawW, drawH, drawX, drawY;

    if (imgRatio > canvasRatio) {
        drawH = h;
        drawW = h * imgRatio;
        drawX = (w - drawW) / 2;
        drawY = 0;
    } else {
        drawW = w;
        drawH = w / imgRatio;
        drawX = 0;
        drawY = (h - drawH) / 2;
    }
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

function getBtnColor(mode: BtnColorMode) {
    switch(mode) {
        case 'blue': return '#2563eb';
        case 'green': return '#16a34a';
        case 'black': return '#0f172a';
        case 'orange': 
        default: return '#ea580c';
    }
}

function drawIcon(ctx: CanvasRenderingContext2D, type: 'calendar' | 'clock' | 'pin', x: number, y: number, size: number, color: string, isLightText: boolean) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.translate(x, y); 

    ctx.beginPath();
    const r = size / 2;

    if (type === 'calendar') {
        ctx.rect(-r, -r + 4, size, size - 4);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r + 4, -r); ctx.lineTo(-r + 4, -r + 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r - 4, -r); ctx.lineTo(r - 4, -r + 8); ctx.stroke();
        ctx.fillRect(-2, 0, 4, 4);
    } else if (type === 'clock') {
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, -r + 5);
        ctx.moveTo(0, 0); ctx.lineTo(r - 5, 0);
        ctx.stroke();
    } else if (type === 'pin') {
        ctx.beginPath();
        ctx.arc(0, -2, r - 2, 0, Math.PI * 2);
        ctx.fill(); 
        ctx.beginPath();
        ctx.moveTo(-r + 2, 0);
        ctx.lineTo(0, r + 4); 
        ctx.lineTo(r - 2, 0);
        ctx.fill();
        // 中間挖空
        ctx.fillStyle = isLightText ? '#000' : '#fff'; 
        ctx.beginPath();
        ctx.arc(0, -2, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// --- Main Component ---

const App = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // State
    const [config, setConfig] = useState<ConfigState>({
        tag: 'KAA 電影欣賞',
        title: '阿凡達：火與燼',
        subtitle: '和建築人一起走進潘朵拉',
        date: '2025 / 12 / 20（六）',
        time: '14:00 – 17:00',
        location: '高雄大遠百威秀影城',
        ctaText: '查看活動資訊',
        ctaUrl: 'https://www.kaa.org.tw/news_show.php?b=7078&t1=1',
        textColorMode: 'light',
        btnColorMode: 'orange',
        bgImage: null
    });

    const [hasTitleError, setHasTitleError] = useState(false);

    // Effect to redraw canvas when config changes
    useEffect(() => {
        if (!config.title.trim()) {
            setHasTitleError(true);
        } else {
            setHasTitleError(false);
        }
        drawPoster();
    }, [config]);

    // Ensure fonts are loaded before initial draw
    useEffect(() => {
        document.fonts.ready.then(() => {
            drawPoster();
        });
    }, []);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                setConfig(prev => ({ ...prev, bgImage: img }));
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        let filename = config.title.trim() || 'poster';
        filename = filename.replace(/[\\/:*?"<>|]/g, '_');
        
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const drawPoster = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const isDarkMode = config.textColorMode === 'light'; 

        // Colors
        const colors = {
            text: isDarkMode ? '#FFFFFF' : '#1e293b',
            subText: isDarkMode ? '#e2e8f0' : '#475569',
            btnBg: getBtnColor(config.btnColorMode),
            btnText: '#FFFFFF',
            overlayStart: isDarkMode ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)',
            overlayEnd: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)',
            shadow: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)'
        };

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Background
        if (config.bgImage) {
            drawCoverImage(ctx, config.bgImage, w, h);
        } else {
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, '#0f172a');
            grad.addColorStop(1, '#c2410c');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        // Gradient Mask
        const maskHeight = h * 0.55; 
        const maskY = h - maskHeight;
        const maskGrad = ctx.createLinearGradient(0, maskY, 0, h);
        maskGrad.addColorStop(0, colors.overlayStart);
        maskGrad.addColorStop(0.3, isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)');
        maskGrad.addColorStop(1, colors.overlayEnd);
        ctx.fillStyle = maskGrad;
        ctx.fillRect(0, maskY, w, maskHeight);

        // Text settings
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = colors.shadow;
        ctx.shadowBlur = isDarkMode ? 10 : 0;
        ctx.shadowOffsetY = isDarkMode ? 2 : 0;

        const centerX = w / 2;

        // 1. Tag
        if (config.tag.trim()) {
            ctx.font = '700 40px "Noto Sans TC"';
            ctx.fillStyle = colors.subText;
            ctx.fillText(config.tag, centerX, 160);
        }

        // 2. Main Title
        ctx.font = '900 80px "Noto Sans TC"';
        ctx.fillStyle = colors.text;
        const titleY = 260;
        const titleLines = wrapText(ctx, config.title, 880);
        const startTitleY = titleLines.length > 1 ? titleY - 20 : titleY;
        const lineHeight = 100;
        
        titleLines.forEach((line, index) => {
            ctx.fillText(line, centerX, startTitleY + (index * lineHeight));
        });

        const titleEndPos = startTitleY + (titleLines.length - 1) * lineHeight;

        // 3. Subtitle
        if (config.subtitle.trim()) {
            ctx.font = '700 42px "Noto Sans TC"';
            ctx.fillStyle = colors.subText;
            ctx.fillText(config.subtitle, centerX, titleEndPos + 80);
        }

        // 4. Info Section
        const infoStartY = 600;
        const infoGap = 65;
        const iconSize = 28;
        
        ctx.font = '500 40px "Noto Sans TC"';
        ctx.fillStyle = colors.text;
        ctx.textAlign = 'left'; 

        const drawInfoLine = (text: string, y: number, iconType: 'calendar' | 'clock' | 'pin') => {
            if(!text) return;
            const textWidth = ctx.measureText(text).width;
            const iconPadding = 20;
            const totalWidth = iconSize + iconPadding + textWidth;
            const startX = centerX - (totalWidth / 2);

            drawIcon(ctx, iconType, startX + iconSize/2, y, iconSize, colors.text, !isDarkMode);
            ctx.fillText(text, startX + iconSize + iconPadding, y);
        };

        drawInfoLine(config.date, infoStartY, 'calendar');
        drawInfoLine(config.time, infoStartY + infoGap, 'clock');
        drawInfoLine(config.location, infoStartY + infoGap * 2, 'pin');

        // 5. CTA Button
        const btnText = config.ctaText.trim();
        if (btnText) {
            const btnY = 880;
            const btnW = 600;
            const btnH = 120;
            const btnR = 60;

            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowOffsetY = 10;

            ctx.fillStyle = colors.btnBg;
            roundRect(ctx, centerX - btnW/2, btnY - btnH/2, btnW, btnH, btnR, true);

            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = colors.btnText;
            ctx.textAlign = 'center';
            ctx.font = '700 44px "Noto Sans TC"';
            
            ctx.fillText(`➤  ${btnText}`, centerX, btnY + 2);
        }
    };

    return (
        <>
            <header>
                <h1>✨ 活動海報產生器</h1>
            </header>

            <div className="container">
                <div className="editor-panel">
                    <div className="form-group">
                        <label htmlFor="tag">標籤文字 (Tag)</label>
                        <input type="text" name="tag" id="tag" value={config.tag} onChange={handleInputChange} placeholder="例如：KAA 電影欣賞" />
                    </div>

                    <div className="form-group">
                        <label htmlFor="title">主標題 (必填)</label>
                        <input type="text" name="title" id="title" value={config.title} onChange={handleInputChange} placeholder="例如：阿凡達：火與燼" />
                        {hasTitleError && <div className="error-msg">請輸入主標題</div>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="subtitle">副標題</label>
                        <input type="text" name="subtitle" id="subtitle" value={config.subtitle} onChange={handleInputChange} placeholder="例如：和建築人一起走進潘朵拉" />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="date">日期</label>
                            <input type="text" name="date" id="date" value={config.date} onChange={handleInputChange} placeholder="2025 / 12 / 20（六）" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="time">時間</label>
                            <input type="text" name="time" id="time" value={config.time} onChange={handleInputChange} placeholder="14:00 – 17:00" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="location">地點</label>
                        <input type="text" name="location" id="location" value={config.location} onChange={handleInputChange} placeholder="高雄大遠百威秀影城" />
                    </div>

                    <div className="form-group">
                        <label htmlFor="ctaText">CTA 按鈕文字</label>
                        <input type="text" name="ctaText" id="ctaText" value={config.ctaText} onChange={handleInputChange} placeholder="查看活動資訊" />
                    </div>

                    <div className="form-group">
                        <label htmlFor="ctaUrl">CTA 連結 (僅顯示於預覽下方)</label>
                        <input type="text" name="ctaUrl" id="ctaUrl" value={config.ctaUrl} onChange={handleInputChange} placeholder="https://..." />
                    </div>

                    <div className="form-group">
                        <label htmlFor="bgImage">背景圖片 (若無則使用預設漸層)</label>
                        <input type="file" id="bgImage" accept="image/*" onChange={handleFileChange} />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="textColorMode">文字配色</label>
                            <select name="textColorMode" id="textColorMode" value={config.textColorMode} onChange={handleInputChange}>
                                <option value="light">淺色字 (適合深背景)</option>
                                <option value="dark">深色字 (適合淺背景)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="btnColorMode">按鈕配色</label>
                            <select name="btnColorMode" id="btnColorMode" value={config.btnColorMode} onChange={handleInputChange}>
                                <option value="orange">活力橘</option>
                                <option value="blue">科技藍</option>
                                <option value="green">清新綠</option>
                                <option value="black">極致黑</option>
                            </select>
                        </div>
                    </div>

                    <div className="btn-group">
                        <button className="btn-outline" onClick={() => drawPoster()}>更新預覽</button>
                        <button className="btn-primary" onClick={handleDownload}>下載 PNG</button>
                    </div>
                </div>

                <div className="preview-panel">
                    <div className="canvas-container">
                        <canvas ref={canvasRef} width={1040} height={1040} />
                    </div>
                    {config.ctaUrl && (
                        <div className="preview-hint">
                            💁‍♂️ <strong>建議連結設定：</strong><br/>
                            <a href={config.ctaUrl} target="_blank" rel="noreferrer">{config.ctaUrl}</a>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

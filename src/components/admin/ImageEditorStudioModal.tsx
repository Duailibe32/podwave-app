import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Check,
  X,
  Upload,
  RefreshCw,
  Download,
  Layers,
  Sliders,
  Flame,
  Zap,
  CheckCircle2,
  AlertCircle,
  Split,
  Eye,
  SunMedium,
  Palette,
  Droplet,
  MoveHorizontal,
  ChevronRight,
  Package,
} from 'lucide-react';

export interface ImageEditorStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImageUrl?: string;
  contextTitle?: string; // e.g. "Modelo V55" or "Sabor Watermelon Ice"
  onApplyImage: (imageUrl: string) => void;
}

type StudioTab = 'enhance' | 'variations' | 'filters';

interface GeneratedResult {
  id: string;
  url: string;
  title: string;
  desc: string;
  timestamp: string;
}

export const ImageEditorStudioModal: React.FC<ImageEditorStudioModalProps> = ({
  isOpen,
  onClose,
  initialImageUrl = '',
  contextTitle = 'Produto PodWave',
  onApplyImage,
}) => {
  // Source image state
  const [sourceImage, setSourceImage] = useState<string>(initialImageUrl);
  const [selectedResult, setSelectedResult] = useState<GeneratedResult | null>(null);
  const [resultsHistory, setResultsHistory] = useState<GeneratedResult[]>([]);

  // Studio tabs
  const [activeTab, setActiveTab] = useState<StudioTab>('enhance');

  // Sliders for Fine-Tuning
  const [brightness, setBrightness] = useState<number>(108);
  const [contrast, setContrast] = useState<number>(120);
  const [saturation, setSaturation] = useState<number>(125);
  const [sharpnessGlow, setSharpnessGlow] = useState<number>(25);

  // Selected Style Preset
  const [selectedStyle, setSelectedStyle] = useState<string>('neon_glow');
  const [hasSmokeEffect, setHasSmokeEffect] = useState<boolean>(true);
  const [hasReflectiveFloor, setHasReflectiveFloor] = useState<boolean>(true);

  // Loading state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // View mode (split vs single)
  const [viewMode, setViewMode] = useState<'split' | 'result_only' | 'source_only'>('split');

  // Off-screen canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (initialImageUrl) {
      setSourceImage(initialImageUrl);
    }
  }, [initialImageUrl]);

  if (!isOpen) return null;

  // 10 Modelos Profissionais de Aprimoramento
  const ENHANCE_PROFILES = [
    {
      id: 'neon_glow',
      title: '🚀 Neon PodWave Studio',
      badge: 'OFICIAL',
      desc: 'Cenário cyberpunk escuro com aura volumétrica roxa (#8423DA) e azul (#00DFFF), com reflexo espelhado na base.',
      brightness: 110,
      contrast: 125,
      saturation: 130,
      glow: 35,
    },
    {
      id: 'studio_hdr',
      title: '🌟 Iluminação Estúdio HDR',
      badge: 'PRO',
      desc: 'Realça reflexos metálicos, display digital e bocal com luz difusa de alta fidelidade e contraste nítido.',
      brightness: 115,
      contrast: 120,
      saturation: 115,
      glow: 15,
    },
    {
      id: 'ice_frost',
      title: '❄️ Ice Frost & Bruma Polar',
      badge: 'REFRESCANTE',
      desc: 'Tonalidade azulada gélida com partículas cristalinas, aura de vapor frio e realce dos leds.',
      brightness: 108,
      contrast: 120,
      saturation: 125,
      glow: 40,
    },
    {
      id: 'luxury_dark',
      title: '💎 Dark Luxury Black Gold',
      badge: 'PREMIUM',
      desc: 'Fundo preto acetinado com sutil iluminação dourada e acabamento de alta tecnologia.',
      brightness: 102,
      contrast: 135,
      saturation: 110,
      glow: 25,
    },
    {
      id: 'vapour_storm',
      title: '💨 Vapour Storm & Névoa',
      badge: 'ATMOSFERA',
      desc: 'Elegante névoa de vapor saindo suavemente do bocal e envolvendo a base com iluminação backlight.',
      brightness: 112,
      contrast: 122,
      saturation: 120,
      glow: 30,
    },
    {
      id: 'display_boost',
      title: '⚡ Display OLED & LED Boost',
      badge: 'HIGH-TECH',
      desc: 'Foco especial no visor digital, medidores de bateria e contadores de puffs com brilho pulsante.',
      brightness: 118,
      contrast: 130,
      saturation: 135,
      glow: 45,
    },
    {
      id: 'pure_white',
      title: '🤍 Clean White E-Commerce',
      badge: 'CATÁLOGO',
      desc: 'Fundo branco estúdio de e-commerce internacional com sombra suave projetada e foco cristalino.',
      brightness: 105,
      contrast: 110,
      saturation: 105,
      glow: 5,
    },
    {
      id: 'sunset_warm',
      title: '🌅 Sunset Warm Amber',
      badge: 'TROPICAL',
      desc: 'Iluminação dourada de fim de tarde com tons de âmbar quente e reflexos alaranjados de verão.',
      brightness: 112,
      contrast: 120,
      saturation: 128,
      glow: 35,
    },
    {
      id: 'ultraviolet',
      title: '🔮 Deep Ultraviolet UV',
      badge: 'NEON UV',
      desc: 'Fundo violeta escuro com luz negra UV que destaca grafismos e detalhes luminosos fluorescentes.',
      brightness: 106,
      contrast: 132,
      saturation: 140,
      glow: 40,
    },
    {
      id: 'stealth_carbon',
      title: '🏎️ Stealth Tech & Carbon Dark',
      badge: 'ESPORTIVO',
      desc: 'Preto profundo fosco com contornos metálicos agressivos e contraste ultra-definido.',
      brightness: 100,
      contrast: 140,
      saturation: 95,
      glow: 18,
    },
  ];

  // 10 Modelos Profissionais de Variações Únicas
  const VARIATION_PROFILES = [
    {
      id: 'var_mirror_angle',
      title: '🔄 Ângulo Comercial 45°',
      badge: 'PERSPECTIVA',
      desc: 'Perspectiva dinâmica espelhada sobre pedestal circular luminoso com borda neon.',
      accent: 'ice_cyan',
    },
    {
      id: 'var_flavor_fruits',
      title: '🍓 Morango & Frutas Vermelhas',
      badge: 'SABOR',
      desc: 'Composição dinâmica com frutas frescas, gotículas d\'água e selo de intensidade.',
      accent: 'grape_purple',
    },
    {
      id: 'var_watermelon_mint',
      title: '🍉 Melancia Fresh & Menta',
      badge: 'TROPICAL',
      desc: 'Variação refrescante com fatias de melancia, folhas de hortelã e orvalho brilhante.',
      accent: 'fresh_green',
    },
    {
      id: 'var_subzero',
      title: '🧊 Sub-Zero Ultra Frozen',
      badge: 'GÉLIDO',
      desc: 'Camada de condensação gelada no pod com vapor sub-zero e luz ciano polar.',
      accent: 'frozen_blue',
    },
    {
      id: 'var_cyber_showcase',
      title: '⚡ Vitrine Cyberpunk Laser',
      badge: 'FUTURISTA',
      desc: 'Anéis concêntricos de laser neon, grade digital no chão e piso espelhado.',
      accent: 'sunset_orange',
    },
    {
      id: 'var_grape_bubblegum',
      title: '🍇 Grape Bubblegum Pop',
      badge: 'DOCE & ICE',
      desc: 'Névoa roxa aveludada com bolhas e atmosfera doce e frutada marcante.',
      accent: 'purple_grape',
    },
    {
      id: 'var_gold_edition',
      title: '🔥 Gold Luxury Edition',
      badge: 'ED. LIMITADA',
      desc: 'Carcaça com detalhes dourados nobres, partículas douradas e iluminação de luxo.',
      accent: 'gold',
    },
    {
      id: 'var_chameleon_holo',
      title: '🌈 Furta-Cor Cromado Holo',
      badge: 'HOLOGRÁFICO',
      desc: 'Efeito cromado holográfico furta-cor com reflexos de iluminação multicor.',
      accent: 'chameleon',
    },
    {
      id: 'var_floating_pod',
      title: '🛸 Zero-Gravity Floating',
      badge: 'LEVITANDO',
      desc: 'Dispositivo levitando no centro da tela com feixe de luz inferior e sombra projetada.',
      accent: 'blue_beam',
    },
    {
      id: 'var_luxury_box',
      title: '📦 Showcase Vitrine Oficial',
      badge: 'SHOWCASE',
      desc: 'Apresentação comercial com pedestal de acrílico iluminado e selo PodWave.',
      accent: 'official',
    },
  ];

  // Apply a profile
  const handleSelectProfile = (profile: typeof ENHANCE_PROFILES[0]) => {
    setSelectedStyle(profile.id);
    setBrightness(profile.brightness);
    setContrast(profile.contrast);
    setSaturation(profile.saturation);
    setSharpnessGlow(profile.glow);
  };

  // Upload image handler
  const handleUploadSource = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSourceImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Render Studio Engine Image on Canvas (supports 20 distinct profiles)
  const renderStudioImage = async (
    profileId: string,
    isVariation: boolean = false
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!sourceImage) {
        reject(new Error('Nenhuma imagem base selecionada.'));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        const size = 1080;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context indisponível'));
          return;
        }

        ctx.clearRect(0, 0, size, size);

        // 1. Draw Background Theme according to profile
        if (profileId === 'pure_white') {
          // Pure White E-Commerce Studio
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, size, size);

          // Soft studio floor gradient
          const floorGrad = ctx.createRadialGradient(size / 2, size * 0.85, 50, size / 2, size * 0.85, 400);
          floorGrad.addColorStop(0, 'rgba(0, 0, 0, 0.12)');
          floorGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = floorGrad;
          ctx.fillRect(0, size * 0.65, size, size * 0.35);
        } else if (profileId === 'sunset_warm') {
          // Warm Sunset Amber
          const bgGrad = ctx.createRadialGradient(size / 2, size / 2 - 30, 80, size / 2, size / 2, size * 0.75);
          bgGrad.addColorStop(0, 'rgba(245, 158, 11, 0.40)');
          bgGrad.addColorStop(0.4, 'rgba(239, 68, 68, 0.20)');
          bgGrad.addColorStop(0.8, '#1A0E08');
          bgGrad.addColorStop(1, '#0A0503');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, size, size);
        } else if (profileId === 'ultraviolet' || profileId === 'var_grape_bubblegum') {
          // Deep Ultraviolet / Purple Vibe
          const bgGrad = ctx.createRadialGradient(size / 2, size / 2 - 20, 80, size / 2, size / 2, size * 0.75);
          bgGrad.addColorStop(0, 'rgba(147, 51, 234, 0.45)');
          bgGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.18)');
          bgGrad.addColorStop(0.8, '#130924');
          bgGrad.addColorStop(1, '#070210');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, size, size);
        } else if (profileId === 'var_gold_edition') {
          // Gold Luxury Edition
          const bgGrad = ctx.createRadialGradient(size / 2, size / 2 - 30, 80, size / 2, size / 2, size * 0.75);
          bgGrad.addColorStop(0, 'rgba(234, 179, 8, 0.45)');
          bgGrad.addColorStop(0.4, 'rgba(217, 119, 6, 0.22)');
          bgGrad.addColorStop(0.8, '#1A1508');
          bgGrad.addColorStop(1, '#090702');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, size, size);

          // Golden sparkle ring
          ctx.beginPath();
          ctx.arc(size / 2, size / 2 - 20, 300, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.40)';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#FACC15';
          ctx.shadowBlur = 25;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (profileId === 'var_watermelon_mint') {
          // Watermelon Pink + Green Fresh
          const bgGrad = ctx.createRadialGradient(size / 2, size / 2 - 20, 80, size / 2, size / 2, size * 0.75);
          bgGrad.addColorStop(0, 'rgba(244, 63, 94, 0.35)');
          bgGrad.addColorStop(0.4, 'rgba(16, 185, 129, 0.20)');
          bgGrad.addColorStop(0.8, '#13111C');
          bgGrad.addColorStop(1, '#07060D');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, size, size);
        } else if (profileId === 'var_chameleon_holo') {
          // Holographic Iridescent
          const bgGrad = ctx.createRadialGradient(size / 2, size / 2 - 20, 80, size / 2, size / 2, size * 0.75);
          bgGrad.addColorStop(0, 'rgba(0, 223, 255, 0.35)');
          bgGrad.addColorStop(0.3, 'rgba(229, 60, 243, 0.25)');
          bgGrad.addColorStop(0.6, 'rgba(132, 35, 218, 0.20)');
          bgGrad.addColorStop(1, '#080A1A');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, size, size);
        } else if (profileId === 'stealth_carbon') {
          // Stealth Carbon Dark
          const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 80, size / 2, size / 2, size * 0.8);
          bgGrad.addColorStop(0, '#242838');
          bgGrad.addColorStop(0.6, '#10121D');
          bgGrad.addColorStop(1, '#05060A');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, size, size);
        } else if (profileId === 'ice_frost' || profileId === 'var_subzero') {
          // Ice Polar background
          const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 50, size / 2, size / 2, size * 0.75);
          bgGrad.addColorStop(0, 'rgba(56, 189, 248, 0.40)');
          bgGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.18)');
          bgGrad.addColorStop(1, '#050B17');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, size, size);
        } else if (profileId === 'luxury_dark' || profileId === 'var_luxury_box') {
          // Dark Luxury background
          const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 80, size / 2, size / 2, size * 0.8);
          bgGrad.addColorStop(0, '#1C213E');
          bgGrad.addColorStop(0.6, '#0B0E1E');
          bgGrad.addColorStop(1, '#05060E');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, size, size);
        } else {
          // Default: Cyberpunk PodWave Neon Glow
          const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 80, size / 2, size / 2, size * 0.7);
          bgGrad.addColorStop(0, 'rgba(132, 35, 218, 0.35)');
          bgGrad.addColorStop(0.4, 'rgba(0, 223, 255, 0.20)');
          bgGrad.addColorStop(0.8, '#0A0D1E');
          bgGrad.addColorStop(1, '#050711');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, size, size);

          // Subtle digital neon grid
          ctx.strokeStyle = 'rgba(0, 223, 255, 0.08)';
          ctx.lineWidth = 1.5;
          for (let i = 0; i < size; i += 80) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, size);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(size, i);
            ctx.stroke();
          }

          // Luminous aura ring
          ctx.beginPath();
          ctx.arc(size / 2, size / 2 - 20, 280, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 223, 255, 0.25)';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#00DFFF';
          ctx.shadowBlur = 30;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // 2. Draw Reflective Floor / Pedestal if enabled
        if (hasReflectiveFloor && profileId !== 'pure_white') {
          ctx.save();
          const floorGrad = ctx.createLinearGradient(0, size * 0.65, 0, size);
          floorGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
          floorGrad.addColorStop(0.5, profileId === 'var_gold_edition' ? 'rgba(250, 204, 21, 0.15)' : 'rgba(0, 223, 255, 0.12)');
          floorGrad.addColorStop(1, 'rgba(132, 35, 218, 0.25)');

          ctx.beginPath();
          ctx.ellipse(size / 2, size * 0.82, 360, 90, 0, 0, Math.PI * 2);
          ctx.fillStyle = floorGrad;
          ctx.fill();

          ctx.strokeStyle = profileId === 'var_gold_edition' ? 'rgba(250, 204, 21, 0.4)' : 'rgba(0, 223, 255, 0.35)';
          ctx.lineWidth = 2;
          ctx.shadowColor = profileId === 'var_gold_edition' ? '#FACC15' : '#00DFFF';
          ctx.shadowBlur = 20;
          ctx.stroke();
          ctx.restore();
        }

        // 3. Render Product Image with Lighting & Contrast Filter
        ctx.save();
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

        const targetMaxDim = size * 0.72;
        let drawW = img.width;
        let drawH = img.height;
        const scale = Math.min(targetMaxDim / drawW, targetMaxDim / drawH);
        drawW *= scale;
        drawH *= scale;

        let posX = (size - drawW) / 2;
        let posY = (size - drawH) / 2 - 20;

        // Invert horizontal orientation for mirror angle variation
        if (isVariation && profileId === 'var_mirror_angle') {
          ctx.translate(size, 0);
          ctx.scale(-1, 1);
          posX = (size - drawW) / 2;
        }

        // Elevate device for floating variation
        if (isVariation && profileId === 'var_floating_pod') {
          posY -= 45;
        }

        // Drop Shadow
        ctx.shadowColor = profileId === 'pure_white' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = profileId === 'pure_white' ? 25 : 35;
        ctx.shadowOffsetY = 25;

        ctx.drawImage(img, posX, posY, drawW, drawH);
        ctx.restore();

        // 4. Glow / Highlights Layer
        if (sharpnessGlow > 10 && profileId !== 'pure_white') {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const glowGrad = ctx.createRadialGradient(size / 2, size / 2 - 40, 50, size / 2, size / 2 - 40, 320);
          glowGrad.addColorStop(0, `rgba(0, 223, 255, ${sharpnessGlow * 0.005})`);
          glowGrad.addColorStop(0.5, `rgba(132, 35, 218, ${sharpnessGlow * 0.003})`);
          glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glowGrad;
          ctx.fillRect(0, 0, size, size);
          ctx.restore();
        }

        // 5. Draw Soft Smoke Mist if enabled
        if (hasSmokeEffect && profileId !== 'pure_white') {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const smokeGrad = ctx.createRadialGradient(size / 2, size * 0.22, 10, size / 2, size * 0.18, 140);
          smokeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
          smokeGrad.addColorStop(0.4, 'rgba(0, 223, 255, 0.20)');
          smokeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.beginPath();
          ctx.ellipse(size / 2, size * 0.20, 160, 60, 0, 0, Math.PI * 2);
          ctx.fillStyle = smokeGrad;
          ctx.fill();
          ctx.restore();
        }

        // 6. Draw Specific Badges for Variations
        if (isVariation) {
          ctx.save();
          let badgeText = '';
          let badgeBorderColor = '#00DFFF';

          if (profileId === 'var_flavor_fruits') {
            badgeText = '🍓 SABOR INTENSO';
            badgeBorderColor = '#EF4444';
          } else if (profileId === 'var_watermelon_mint') {
            badgeText = '🍉 MELANCIA & MENTA';
            badgeBorderColor = '#10B981';
          } else if (profileId === 'var_grape_bubblegum') {
            badgeText = '🍇 PURPLE GRAPE';
            badgeBorderColor = '#9333EA';
          } else if (profileId === 'var_gold_edition') {
            badgeText = '★ EDIÇÃO OURO';
            badgeBorderColor = '#FACC15';
          } else if (profileId === 'var_subzero') {
            badgeText = '🧊 SUB-ZERO ICE';
            badgeBorderColor = '#38BDF8';
          } else if (profileId === 'var_luxury_box') {
            badgeText = '⚡ OFICIAL PODWAVE';
            badgeBorderColor = '#00DFFF';
          }

          if (badgeText) {
            ctx.fillStyle = 'rgba(17, 21, 46, 0.88)';
            ctx.strokeStyle = badgeBorderColor;
            ctx.lineWidth = 2;
            ctx.shadowColor = badgeBorderColor;
            ctx.shadowBlur = 15;

            const badgeX = size * 0.08;
            const badgeY = size * 0.10;
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, 280, 56, 16);
            ctx.fill();
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
            ctx.fillText(badgeText, badgeX + 22, badgeY + 36);
          }
          ctx.restore();
        }

        // Export data URL
        const dataUrl = canvas.toDataURL('image/png', 0.95);
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('Erro ao carregar a imagem para processamento no canvas.'));
      };

      img.src = sourceImage;
    });
  };

  // Generate a Batch of 4 Unique Variations at Once
  const handleGenerateBatchVariations = async () => {
    setIsProcessing(true);
    setInfoMessage(null);

    const batchProfiles = [
      VARIATION_PROFILES[0], // var_mirror_angle
      VARIATION_PROFILES[1], // var_flavor_fruits
      VARIATION_PROFILES[2], // var_watermelon_mint
      VARIATION_PROFILES[3], // var_subzero
    ];

    const newItems: GeneratedResult[] = [];

    for (let i = 0; i < batchProfiles.length; i++) {
      const p = batchProfiles[i];
      setProcessingMessage(`Criando variação ${i + 1} de 4 (${p.title})...`);
      try {
        const url = await renderStudioImage(p.id, true);
        newItems.push({
          id: `batch-${Date.now()}-${i}`,
          url,
          title: p.title,
          desc: p.desc,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        });
      } catch (err) {
        console.warn('Erro ao renderizar item do lote:', err);
      }
    }

    if (newItems.length > 0) {
      setResultsHistory((prev) => [...newItems, ...prev]);
      setSelectedResult(newItems[0]);
      setViewMode('split');
    }

    setIsProcessing(false);
    setProcessingMessage('');
  };

  // Execute Generation / Enhancement (100% Local Studio Engine)
  const handleExecuteStudio = async () => {
    setIsProcessing(true);
    setInfoMessage(null);

    try {
      setProcessingMessage('Aplicando iluminação de estúdio, HDR e renderizando 1080p...');
      const renderedUrl = await renderStudioImage(selectedStyle, activeTab === 'variations');

      const currentProfile =
        ENHANCE_PROFILES.find((p) => p.id === selectedStyle) ||
        VARIATION_PROFILES.find((p) => p.id === selectedStyle) ||
        ENHANCE_PROFILES[0];

      const newResult: GeneratedResult = {
        id: `studio-${Date.now()}`,
        url: renderedUrl,
        title: currentProfile.title,
        desc: currentProfile.desc,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setResultsHistory((prev) => [newResult, ...prev]);
      setSelectedResult(newResult);
      setViewMode('split');
    } catch (err: any) {
      console.error('Erro no estúdio:', err);
      setInfoMessage(err?.message || 'Falha ao renderizar imagem.');
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Download high-resolution PNG
  const handleDownload = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `podwave-studio-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="w-full max-w-6xl max-h-[95vh] flex flex-col rounded-3xl bg-[#090C1A] border-2 border-[#8423DA]/50 shadow-[0_0_60px_rgba(132,35,218,0.4)] overflow-hidden text-white">
        {/* HEADER */}
        <div className="px-5 py-3.5 border-b border-[#8423DA]/30 bg-[#0E1229] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8423DA] via-[#007BFF] to-[#00DFFF] p-0.5 shadow-lg shadow-[#00DFFF]/20 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#090C1A] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#00DFFF] animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Estúdio de Imagens PodWave
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#8423DA]/40 to-[#00DFFF]/40 border border-[#00DFFF]/50 text-[10px] font-mono font-black text-[#00DFFF]">
                  20 MODELOS PRO
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-400">
                  100% LOCAL &bull; 1080p Ultra HD
                </span>
              </div>
              <p className="text-[11px] text-[#A5A5B8]">
                Melhore a iluminação e crie variações exclusivas para: <span className="text-white font-semibold">{contextTitle}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#141838] hover:bg-[#8423DA] text-gray-300 hover:text-white transition-all cursor-pointer border border-[#8423DA]/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MAIN BODY: 2 COLUMNS */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-[#8423DA]/25">
          {/* LEFT: CONTROLS & PRESETS (5 COLS) */}
          <div className="lg:col-span-5 p-4 sm:p-5 space-y-4 bg-[#070A17] overflow-y-auto">
            {/* TABS (100% LOCAL & OFFLINE) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#101430] border border-[#8423DA]/30">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('enhance');
                  setSelectedStyle('neon_glow');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'enhance'
                    ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5 shrink-0 text-[#00DFFF]" />
                <span className="truncate">Melhorar Foto (10)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('variations');
                  setSelectedStyle('var_mirror_angle');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'variations'
                    ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0 text-[#00DFFF]" />
                <span className="truncate">Criar Variações (10)</span>
              </button>
            </div>

            {/* SOURCE IMAGE CARD */}
            <div className="p-3 rounded-2xl bg-[#0D1129] border border-[#8423DA]/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-14 h-14 rounded-xl bg-black/40 border border-white/10 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                  {sourceImage ? (
                    <img src={sourceImage} alt="" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-600" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <span className="text-[10px] text-[#00DFFF] font-bold uppercase tracking-wider block">Foto Base Ativa</span>
                  <p className="text-xs font-bold text-white truncate max-w-[200px]">
                    {contextTitle}
                  </p>
                </div>
              </div>

              <label className="px-3 py-1.5 rounded-xl bg-[#141838] hover:bg-[#8423DA] text-gray-300 hover:text-white border border-[#8423DA]/40 text-[11px] font-semibold cursor-pointer transition flex items-center gap-1 shrink-0">
                <Upload className="w-3 h-3 text-[#00DFFF]" />
                <span>Trocar</span>
                <input type="file" accept="image/*" onChange={handleUploadSource} className="hidden" />
              </label>
            </div>

            {/* TAB CONTENT: ENHANCE (10 MODELOS) */}
            {activeTab === 'enhance' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-200">
                    10 Modelos de Iluminação & Estúdio:
                  </label>
                  <span className="text-[10px] text-[#00DFFF] font-bold">10 Opções Prontas</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                  {ENHANCE_PROFILES.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => handleSelectProfile(profile)}
                      className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        selectedStyle === profile.id
                          ? 'bg-[#151A3B] border-[#00DFFF] ring-1 ring-[#00DFFF]/50 shadow-lg shadow-[#00DFFF]/10'
                          : 'bg-[#0E122A] hover:bg-[#121636] border-white/10'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-white truncate">{profile.title}</span>
                          <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-[#00DFFF]/20 text-[#00DFFF] font-bold shrink-0">
                            {profile.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#A5A5B8] leading-tight line-clamp-2">{profile.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: VARIATIONS (10 MODELOS + BATCH GENERATOR) */}
            {activeTab === 'variations' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-200">
                    10 Modelos de Variações Exclusivas:
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateBatchVariations}
                    disabled={isProcessing}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#8423DA] to-[#00DFFF] hover:brightness-110 text-white text-[10px] font-black cursor-pointer shadow flex items-center gap-1 active:scale-95"
                    title="Cria automaticamente 4 variações de estilos diferentes de uma vez só"
                  >
                    <Package className="w-3 h-3" />
                    <span>Gerar Pacote de 4</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                  {VARIATION_PROFILES.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => setSelectedStyle(profile.id)}
                      className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        selectedStyle === profile.id
                          ? 'bg-[#151A3B] border-[#00DFFF] ring-1 ring-[#00DFFF]/50 shadow-lg shadow-[#00DFFF]/10'
                          : 'bg-[#0E122A] hover:bg-[#121636] border-white/10'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-white truncate">{profile.title}</span>
                          <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-[#8423DA]/30 text-purple-300 font-bold shrink-0">
                            {profile.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#A5A5B8] leading-tight line-clamp-2">{profile.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}


            {/* TAB CONTENT: FINE ADJUSTMENTS (SLIDERS) */}
            <div className="p-3.5 rounded-2xl bg-[#0D1129] border border-[#8423DA]/25 space-y-3 text-xs">
              <span className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
                <SunMedium className="w-3.5 h-3.5 text-[#00DFFF]" />
                Ajustes Dinâmicos da Iluminação
              </span>

              {/* Brightness */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-300 mb-1">
                  <span>Brilho & Destaque</span>
                  <span className="font-mono text-[#00DFFF] font-bold">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="160"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-[#00DFFF] cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-300 mb-1">
                  <span>Contraste & Profundidade</span>
                  <span className="font-mono text-[#00DFFF] font-bold">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="170"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-[#00DFFF] cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-300 mb-1">
                  <span>Saturação de Cores & LEDs</span>
                  <span className="font-mono text-[#00DFFF] font-bold">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="180"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full accent-[#00DFFF] cursor-pointer"
                />
              </div>

              {/* Effects Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-300">
                  <input
                    type="checkbox"
                    checked={hasSmokeEffect}
                    onChange={(e) => setHasSmokeEffect(e.target.checked)}
                    className="rounded text-[#00DFFF] focus:ring-0 cursor-pointer"
                  />
                  <span>Névoa Suave</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-300">
                  <input
                    type="checkbox"
                    checked={hasReflectiveFloor}
                    onChange={(e) => setHasReflectiveFloor(e.target.checked)}
                    className="rounded text-[#00DFFF] focus:ring-0 cursor-pointer"
                  />
                  <span>Piso com Reflexo</span>
                </label>
              </div>
            </div>

            {/* INFO MESSAGE */}
            {infoMessage && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                {infoMessage}
              </div>
            )}

            {/* ACTION GENERATE BUTTON */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleExecuteStudio}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 active:scale-[0.98] disabled:opacity-60 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_30px_rgba(0,223,255,0.35)] transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#00DFFF]" />
                  <span>{processingMessage || 'Renderizando em Ultra HD...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#00DFFF]" />
                  <span>
                    {activeTab === 'enhance' ? 'Aprimorar com Modelo Selecionado' : 'Gerar Variação Única'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* RIGHT: PREVIEW, COMPARISON & RESULTS (7 COLS) */}
          <div className="lg:col-span-7 p-4 sm:p-5 space-y-4 bg-[#090C1A] flex flex-col justify-between">
            {/* VIEW MODE SELECTOR */}
            <div className="flex items-center justify-between border-b border-[#8423DA]/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-300">Visualização:</span>
                <div className="inline-flex rounded-xl bg-[#11152E] p-1 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                      viewMode === 'split' ? 'bg-[#8423DA] text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Split className="w-3.5 h-3.5" />
                    <span>Antes / Depois</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('result_only')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                      viewMode === 'result_only' ? 'bg-[#8423DA] text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#00DFFF]" />
                    <span>Resultado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('source_only')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                      viewMode === 'source_only' ? 'bg-[#8423DA] text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Original</span>
                  </button>
                </div>
              </div>

              {selectedResult && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(selectedResult.url)}
                    className="p-1.5 rounded-lg bg-[#141838] hover:bg-[#8423DA] text-gray-300 hover:text-white border border-white/10 text-xs font-semibold cursor-pointer transition flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Baixar 1080p</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceImage(selectedResult.url)}
                    className="p-1.5 rounded-lg bg-[#141838] hover:bg-[#8423DA] text-gray-300 hover:text-white border border-white/10 text-xs font-semibold cursor-pointer transition flex items-center gap-1"
                    title="Usar este resultado como base para continuar criando variações"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#00DFFF]" />
                    <span className="hidden sm:inline">Reiterar</span>
                  </button>
                </div>
              )}
            </div>

            {/* PREVIEW CANVAS DISPLAY */}
            <div className="flex-1 min-h-[300px] sm:min-h-[380px] rounded-3xl bg-[#060813] border-2 border-[#8423DA]/30 p-4 flex items-center justify-center relative overflow-hidden shadow-inner">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 animate-in fade-in">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-[#00DFFF]/20 border-t-[#00DFFF] animate-spin" />
                    <Sparkles className="w-6 h-6 text-[#00DFFF] absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-heading text-sm font-bold text-white">Renderizando com Qualidade PodWave</h4>
                    <p className="text-xs text-[#00DFFF] font-mono mt-1">{processingMessage}</p>
                  </div>
                </div>
              ) : selectedResult ? (
                <div className="w-full h-full flex flex-col justify-center">
                  {viewMode === 'split' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full items-center">
                      {/* Left: Original */}
                      <div className="h-full flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0B0E21] border border-white/10">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Imagem Original
                        </span>
                        <div className="flex-1 max-h-[280px] w-full flex items-center justify-center overflow-hidden">
                          {sourceImage ? (
                            <img src={sourceImage} alt="Antes" className="max-h-full max-w-full object-contain rounded-xl" />
                          ) : (
                            <span className="text-xs text-gray-500">Sem imagem</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Enhanced */}
                      <div className="h-full flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0B0E21] border-2 border-[#00DFFF]/60 shadow-[0_0_25px_rgba(0,223,255,0.25)]">
                        <span className="text-[10px] font-bold text-[#00DFFF] uppercase tracking-widest mb-2 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#00DFFF]" /> {selectedResult.title}
                        </span>
                        <div className="flex-1 max-h-[280px] w-full flex items-center justify-center overflow-hidden">
                          <img
                            src={selectedResult.url}
                            alt="Depois"
                            className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ) : viewMode === 'result_only' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                      <img
                        src={selectedResult.url}
                        alt="Resultado"
                        className="max-h-[340px] max-w-full object-contain rounded-2xl shadow-[0_0_30px_rgba(132,35,218,0.3)]"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                      {sourceImage ? (
                        <img
                          src={sourceImage}
                          alt="Original"
                          className="max-h-[340px] max-w-full object-contain rounded-2xl"
                        />
                      ) : (
                        <span className="text-xs text-gray-500">Sem foto original</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#121633] border border-white/10 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-[#00DFFF]/60" />
                  </div>
                  <div>
                    <h4 className="font-heading text-sm font-bold text-gray-300">Escolha entre 20 modelos disponíveis</h4>
                    <p className="text-xs text-gray-500 max-w-sm mt-1">
                      Selecione um dos 10 estilos de estúdio ou 10 tipos de variações exclusivas e clique no botão
                      abaixo para renderizar instantaneamente em 1080p.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* GALLERY OF GENERATED VARIATIONS IN THIS SESSION */}
            {resultsHistory.length > 0 && (
              <div className="p-3 rounded-2xl bg-[#0D1024] border border-[#8423DA]/25 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#00DFFF]" />
                    Galeria de Variações Criadas ({resultsHistory.length}) &bull; Clique para alternar
                  </span>
                  <span className="text-[10px] text-gray-400">Clique para inspecionar</span>
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {resultsHistory.map((resItem) => (
                    <button
                      key={resItem.id}
                      type="button"
                      onClick={() => {
                        setSelectedResult(resItem);
                        setViewMode('split');
                      }}
                      className={`relative w-16 h-16 rounded-xl border-2 shrink-0 overflow-hidden cursor-pointer transition ${
                        selectedResult?.id === resItem.id
                          ? 'border-[#00DFFF] ring-2 ring-[#00DFFF]/50 shadow-md scale-105'
                          : 'border-white/20 hover:border-white/50 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img src={resItem.url} alt="" className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 right-0 bg-black/75 text-[8px] font-mono px-1 rounded-tl text-white">
                        {resItem.timestamp}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ACTION FOOTER */}
            <div className="pt-3 border-t border-[#8423DA]/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-[#A5A5B8]">
                {selectedResult
                  ? 'Gostou do resultado? Clique em "Aplicar Foto" para salvá-la no catálogo.'
                  : 'Gere uma variação para habilitar a aplicação no produto.'}
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#141838] hover:bg-[#1f244f] text-gray-300 hover:text-white text-xs font-semibold cursor-pointer transition"
                >
                  Fechar
                </button>

                <button
                  type="button"
                  disabled={!selectedResult}
                  onClick={() => {
                    if (selectedResult) {
                      onApplyImage(selectedResult.url);
                      onClose();
                    }
                  }}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-[#080811] text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Aplicar Imagem ao Catálogo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { BannerSlide } from '../../types/catalog';
import {
  Upload,
  Crop,
  Move,
  ZoomIn,
  RotateCcw,
  Smartphone,
  Monitor,
  Plus,
  Trash2,
  Check,
  Eye,
  EyeOff,
  ShoppingBag,
  ArrowRight,
  Layers,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';

const PRESET_IMAGES = [
  { label: 'Logo Oficial PodWave com Neon', url: '/assets/images/logo.png' },
  { label: 'Geek Bar Pulse com Display', url: '/assets/images/pod_geekbar_pulse_1792699212047.jpg' },
  { label: 'Dispositivo Gold & Black Luxo', url: '/assets/images/pod_gold_black_1792699257182.jpg' },
  { label: 'Pod Grape Ice Gelado', url: '/assets/images/pod_grape_ice_1792699243386.jpg' },
  { label: 'Oxbar Magic Maze Display', url: '/assets/images/pod_oxbar_maze_1792699228586.jpg' },
  { label: 'Card Oficial de Referência', url: '/assets/images/reference_card.png' },
];

export const BannerVisualEditor: React.FC = () => {
  const { banners, addBanner, updateBanner, deleteBanner, toggleBannerActive } = useCatalog();

  const [selectedBannerId, setSelectedBannerId] = useState<string>(banners[0]?.id || '');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedBanner = banners.find((b) => b.id === selectedBannerId) || banners[0] || {
    id: 'new',
    title: 'Mais que um Vape, é uma Onda.',
    subtitle: 'Sabores intensos. Tecnologia de ponta. Para quem vive novas experiências.',
    badge: '⚡ PODWAVE OFICIAL',
    tagline: 'SABORES QUE TE LEVAM MAIS LONGE',
    ctaText: 'Ver Produtos',
    ctaLink: '#catalogo',
    active: true,
    imageUrl: '/assets/images/logo.png',
    positionX: 0,
    positionY: 0,
    scale: 1,
    objectFit: 'contain' as const,
    themeGradient: 'neon',
  };

  const [form, setForm] = useState<BannerSlide>({ ...selectedBanner });

  // Update local form when selection changes
  const handleSelectBanner = (banner: BannerSlide) => {
    setSelectedBannerId(banner.id);
    setForm({ ...banner });
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Handle local image upload via FileReader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 8MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        setForm((prev) => ({ ...prev, imageUrl: base64 }));
        showToast('Imagem carregada com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (banners.some((b) => b.id === form.id)) {
      updateBanner(form.id, form);
      showToast('Banner atualizado com sucesso!');
    } else {
      addBanner(form);
      showToast('Novo banner criado com sucesso!');
    }
  };

  const handleAddNew = () => {
    const newSlide: BannerSlide = {
      id: `banner-${Date.now()}`,
      title: 'Novo Banner Promocional',
      subtitle: 'Descrição atrativa para os visitantes da loja.',
      badge: '⚡ DESTAQUE',
      tagline: 'EDIÇÃO LIMITADA',
      ctaText: 'Ver Oferta',
      ctaLink: '#catalogo',
      active: true,
      imageUrl: '/assets/images/logo.png',
      positionX: 0,
      positionY: 0,
      scale: 1,
      objectFit: 'contain',
      themeGradient: 'neon',
    };
    addBanner(newSlide);
    setSelectedBannerId(newSlide.id);
    setForm(newSlide);
    showToast('Novo banner adicionado à lista!');
  };

  const handleResetPosition = () => {
    setForm((prev) => ({
      ...prev,
      positionX: 0,
      positionY: 0,
      scale: 1,
    }));
    showToast('Posicionamento centralizado!');
  };

  // Background gradient class generator
  const getGradientClass = (theme?: string) => {
    switch (theme) {
      case 'cyan':
        return 'from-[#00DFFF]/20 via-[#007BFF]/15 to-[#080811]';
      case 'purple':
        return 'from-[#8423DA]/25 via-[#E53CF3]/15 to-[#080811]';
      case 'emerald':
        return 'from-[#10B981]/20 via-[#065F46]/15 to-[#080811]';
      case 'gold':
        return 'from-[#FACC15]/20 via-[#EAB308]/15 to-[#080811]';
      default:
        return 'from-[#00DFFF]/15 via-[#8423DA]/20 to-[#080811]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#8423DA]/25">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#8423DA]/30 border border-[#8423DA] flex items-center justify-center text-[#00DFFF] font-bold text-xs">
              9
            </span>
            <h2 className="font-heading text-xl font-bold text-white light:text-slate-900">
              Editor Visual de Banners
            </h2>
          </div>
          <p className="text-xs text-[#A5A5B8] mt-1">
            Pré-visualização simultânea para desktop e celular, com upload, recorte e reposicionamento de imagens em carrossel.
          </p>
        </div>

        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white text-xs font-bold shadow-lg hover:brightness-110 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Banner</span>
        </button>
      </div>

      {/* Banner Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {banners.map((b, idx) => {
          const isSelected = b.id === selectedBannerId;
          return (
            <div
              key={b.id}
              onClick={() => handleSelectBanner(b)}
              className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isSelected
                  ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF] shadow-[0_0_15px_rgba(0,223,255,0.3)]'
                  : 'bg-[#11152A] text-gray-300 border-[#8423DA]/25 hover:border-[#8423DA]/60'
              }`}
            >
              <span>Slide {idx + 1}: {b.title.slice(0, 20)}...</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBannerActive(b.id);
                }}
                className="text-[10px] opacity-80 hover:opacity-100"
                title="Ativar/desativar banner"
              >
                {b.active ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-gray-500" />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Form Controls on Left, Dual Simultaneous Preview on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* ================= LEFT COLUMN: VISUAL CONTROLS ================= */}
        <form onSubmit={handleSaveBanner} className="xl:col-span-5 space-y-5">
          {/* Box 1: Image Upload & Crop / Reposition */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-sm font-bold text-[#00DFFF] flex items-center gap-2">
                <Crop className="w-4 h-4 text-[#00DFFF]" />
                Upload, Recorte e Reposicionamento
              </h3>
              <button
                type="button"
                onClick={handleResetPosition}
                className="text-[11px] text-[#A5A5B8] hover:text-[#00DFFF] flex items-center gap-1 cursor-pointer"
                title="Centralizar posição e restaurar escala"
              >
                <RotateCcw className="w-3 h-3" /> Centralizar
              </button>
            </div>

            {/* Upload Button & Dropzone */}
            <div>
              <label className="block font-semibold mb-1 text-gray-300">
                Upload de Imagem Própria
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#8423DA]/40 hover:border-[#00DFFF] rounded-xl p-4 text-center cursor-pointer bg-[#141838]/60 hover:bg-[#141838] transition group"
              >
                <Upload className="w-6 h-6 text-[#00DFFF] mx-auto mb-1 group-hover:scale-110 transition-transform" />
                <p className="font-bold text-white text-xs">Clique para fazer upload de foto</p>
                <p className="text-[10px] text-gray-400">PNG, JPG ou WebP de alta qualidade</p>
              </div>
            </div>

            {/* Or Select from Presets */}
            <div>
              <label className="block font-semibold mb-1 text-gray-300">
                Ou Selecionar da Galeria Oficial
              </label>
              <select
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white font-medium cursor-pointer"
              >
                {PRESET_IMAGES.map((img) => (
                  <option key={img.url} value={img.url}>
                    {img.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Recorte & Posicionamento Sliders */}
            <div className="p-3 rounded-xl bg-[#141838] space-y-3">
              {/* Scale / Zoom Slider */}
              <div>
                <div className="flex justify-between items-center mb-1 text-[11px]">
                  <span className="text-gray-300 flex items-center gap-1 font-semibold">
                    <ZoomIn className="w-3.5 h-3.5 text-[#00DFFF]" /> Zoom / Escala da Imagem:
                  </span>
                  <span className="font-mono text-[#00DFFF] font-bold">
                    {Math.round((form.scale || 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={form.scale || 1}
                  onChange={(e) => setForm({ ...form, scale: parseFloat(e.target.value) })}
                  className="w-full accent-[#00DFFF] cursor-pointer"
                />
              </div>

              {/* Position X Slider */}
              <div>
                <div className="flex justify-between items-center mb-1 text-[11px]">
                  <span className="text-gray-300 flex items-center gap-1 font-semibold">
                    <Move className="w-3.5 h-3.5 text-[#00DFFF]" /> Posição Horizontal (X):
                  </span>
                  <span className="font-mono text-[#00DFFF] font-bold">
                    {form.positionX || 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="2"
                  value={form.positionX || 0}
                  onChange={(e) => setForm({ ...form, positionX: parseInt(e.target.value) })}
                  className="w-full accent-[#00DFFF] cursor-pointer"
                />
              </div>

              {/* Position Y Slider */}
              <div>
                <div className="flex justify-between items-center mb-1 text-[11px]">
                  <span className="text-gray-300 flex items-center gap-1 font-semibold">
                    <Move className="w-3.5 h-3.5 text-[#E53CF3]" /> Posição Vertical (Y):
                  </span>
                  <span className="font-mono text-[#E53CF3] font-bold">
                    {form.positionY || 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="2"
                  value={form.positionY || 0}
                  onChange={(e) => setForm({ ...form, positionY: parseInt(e.target.value) })}
                  className="w-full accent-[#E53CF3] cursor-pointer"
                />
              </div>

              {/* Fit Mode */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                {(['contain', 'cover', 'fill'] as const).map((fit) => (
                  <button
                    key={fit}
                    type="button"
                    onClick={() => setForm({ ...form, objectFit: fit })}
                    className={`py-1.5 rounded-lg font-bold uppercase transition cursor-pointer ${
                      form.objectFit === fit
                        ? 'bg-[#00DFFF] text-black shadow-sm'
                        : 'bg-[#0D1022] text-gray-400 hover:text-white'
                    }`}
                  >
                    {fit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Box 2: Texts, Badges & CTA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 shadow-xl space-y-3 text-xs">
            <h3 className="font-heading text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#8423DA]" />
              Conteúdo & Chamadas
            </h3>

            {/* Title */}
            <div>
              <label className="block font-semibold mb-1 text-gray-300">Título do Banner</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white font-bold"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block font-semibold mb-1 text-gray-300">Subtítulo / Descrição</label>
              <textarea
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                rows={2}
                className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white"
              />
            </div>

            {/* Badge & Tagline */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-gray-300">Etiqueta Superior</label>
                <input
                  type="text"
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  placeholder="⚡ DESTAQUE"
                  className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-300">Frase / Tagline</label>
                <input
                  type="text"
                  value={form.tagline || ''}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="SABORES QUE TE LEVAM MAIS LONGE"
                  className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white"
                />
              </div>
            </div>

            {/* CTA Text & Link */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-gray-300">Texto do Botão (CTA)</label>
                <input
                  type="text"
                  value={form.ctaText}
                  onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                  placeholder="Ver Produtos"
                  className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-300">Destino do Link</label>
                <input
                  type="text"
                  value={form.ctaLink}
                  onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                  placeholder="#catalogo"
                  className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white font-mono"
                />
              </div>
            </div>

            {/* Theme Gradient Selector */}
            <div>
              <label className="block font-semibold mb-1 text-gray-300">Estilo de Gradiente</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'neon', label: 'Neon' },
                  { id: 'cyan', label: 'Ciano' },
                  { id: 'purple', label: 'Roxo' },
                  { id: 'emerald', label: 'Verde' },
                  { id: 'gold', label: 'Dourado' },
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setForm({ ...form, themeGradient: th.id })}
                    className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer border ${
                      form.themeGradient === th.id
                        ? 'bg-[#8423DA] text-white border-[#00DFFF] shadow-md'
                        : 'bg-[#141838] text-gray-400 border-transparent hover:text-white'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 flex items-center justify-between border-t border-[#8423DA]/20">
              <button
                type="button"
                onClick={() => {
                  if (banners.length <= 1) {
                    alert('Você deve manter pelo menos um banner no carrossel.');
                    return;
                  }
                  if (confirm('Deseja excluir este banner?')) {
                    deleteBanner(form.id);
                    setSelectedBannerId(banners[0]?.id || '');
                    showToast('Banner excluído!');
                  }
                }}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir Banner
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </form>

        {/* ================= RIGHT COLUMN: DUAL SIMULTANEOUS PREVIEW ================= */}
        <div className="xl:col-span-7 space-y-6">
          {/* Header Indicator */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#00DFFF] flex items-center gap-1.5 uppercase tracking-wider">
              <Eye className="w-4 h-4" /> Pré-Visualização Simultânea ao Vivo
            </span>
            <span className="text-[11px] text-[#A5A5B8]">
              Atualiza em tempo real enquanto você ajusta
            </span>
          </div>

          {/* 1. DESKTOP PREVIEW WINDOW */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
              <Monitor className="w-4 h-4 text-[#00DFFF]" />
              <span>Visualização Desktop (Computador / Notebook)</span>
            </div>

            {/* Browser Mockup Window */}
            <div className="rounded-2xl bg-[#090C1A] border-2 border-[#8423DA]/40 shadow-2xl overflow-hidden">
              {/* Browser Header Bar */}
              <div className="bg-[#11152A] px-4 py-2 border-b border-[#8423DA]/25 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <div className="flex-grow max-w-xs mx-auto bg-[#090C1A] px-3 py-0.5 rounded-md text-[10px] text-gray-400 font-mono text-center truncate border border-white/5">
                  https://podwave.com.br/destaque
                </div>
              </div>

              {/* Desktop Render Container */}
              <div className={`p-6 sm:p-8 bg-gradient-to-r ${getGradientClass(form.themeGradient)} min-h-[220px] sm:min-h-[250px] relative flex items-center justify-between overflow-hidden`}>
                {/* Ambient glow */}
                <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-48 h-48 bg-[#00DFFF]/20 rounded-full blur-3xl pointer-events-none" />

                {/* Left: Texts */}
                <div className="max-w-xs sm:max-w-md space-y-2.5 relative z-10 text-left">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#8423DA]/30 border border-[#8423DA] text-[#00DFFF] text-[10px] font-black uppercase tracking-wider">
                    {form.badge || '⚡ PODWAVE'}
                  </span>
                  <h3 className="font-heading text-lg sm:text-2xl font-black text-white leading-tight break-words">
                    {form.title}
                  </h3>
                  <p className="text-xs text-[#A5A5B8] line-clamp-2 leading-relaxed">
                    {form.subtitle}
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 shadow-md pointer-events-none"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{form.ctaText || 'Ver Produtos'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    {form.tagline && (
                      <span className="text-[10px] font-mono text-[#00DFFF] px-2 py-1 rounded bg-black/40">
                        {form.tagline}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Scaled & Positioned Image */}
                <div className="relative w-40 sm:w-52 h-40 sm:h-52 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={form.imageUrl || '/assets/images/logo.png'}
                    alt="Desktop Preview"
                    style={{
                      transform: `translate(${form.positionX || 0}%, ${form.positionY || 0}%) scale(${form.scale || 1})`,
                      objectFit: form.objectFit || 'contain',
                    }}
                    className="w-full h-full filter drop-shadow-[0_8px_20px_rgba(0,223,255,0.4)] transition-all duration-150 select-none pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. SMARTPHONE MOBILE PREVIEW FRAME */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
              <Smartphone className="w-4 h-4 text-[#E53CF3]" />
              <span>Visualização Mobile (Smartphone / Celular)</span>
            </div>

            {/* Phone Mockup Frame */}
            <div className="max-w-[320px] mx-auto rounded-[36px] bg-[#090C1A] border-4 border-[#232958] shadow-2xl overflow-hidden p-2">
              {/* Speaker Notch */}
              <div className="w-24 h-4 bg-[#141838] rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="w-8 h-1 rounded-full bg-gray-600 inline-block" />
              </div>

              {/* Phone Screen Container */}
              <div className={`rounded-[26px] p-4 bg-gradient-to-b ${getGradientClass(form.themeGradient)} min-h-[280px] flex flex-col justify-between text-center relative overflow-hidden border border-[#8423DA]/30`}>
                {/* Tag & Title */}
                <div className="space-y-1.5 relative z-10">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-black/60 border border-[#00DFFF]/40 text-[#00DFFF] text-[9px] font-black uppercase">
                    {form.badge || '⚡ PODWAVE'}
                  </span>
                  <h4 className="font-heading text-sm font-black text-white leading-snug line-clamp-2">
                    {form.title}
                  </h4>
                </div>

                {/* Mobile Scaled & Positioned Image */}
                <div className="relative w-36 h-36 mx-auto flex items-center justify-center overflow-hidden my-2">
                  <img
                    src={form.imageUrl || '/assets/images/logo.png'}
                    alt="Mobile Preview"
                    style={{
                      transform: `translate(${form.positionX || 0}%, ${form.positionY || 0}%) scale(${form.scale || 1})`,
                      objectFit: form.objectFit || 'contain',
                    }}
                    className="w-full h-full filter drop-shadow-[0_6px_16px_rgba(0,223,255,0.4)] transition-all duration-150 select-none pointer-events-none"
                  />
                </div>

                {/* Subtitle & Mobile Button */}
                <div className="space-y-2 relative z-10">
                  <p className="text-[10px] text-[#A5A5B8] line-clamp-1">
                    {form.subtitle}
                  </p>
                  <button
                    type="button"
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow pointer-events-none"
                  >
                    <span>{form.ctaText || 'Ver Produtos'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-2xl animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{successToast}</span>
        </div>
      )}
    </div>
  );
};

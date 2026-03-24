
import React, { useState, useEffect, useRef } from 'react';
import { 
  ProductType, OrderSubtype, OrderItem, HoodieType, CapType,
} from '../types';
import { 
  COLORS, SCHOOL_LIST, PRINT_PLACES, SLEEVES,
  SCHOOL_SIZES_KIDS, SCHOOL_SIZES_ADULTS,
  PERSONAL_SIZES_KIDS, PERSONAL_SIZES_ADULTS
} from '../constants';
import { Button } from './ui/Button';
import { PlayerTable } from './PlayerTable';
import { getDesignFeedback } from '../services/geminiService';

interface OrderFormProps {
  productType: ProductType;
  initialSubtype: OrderSubtype;
  onAddToCart: (item: OrderItem | OrderItem[]) => void;
  onCancel: () => void;
}

const FABRICS = ['100% хлопок', 'DryFit'];

export const OrderForm: React.FC<OrderFormProps> = ({ productType, initialSubtype, onAddToCart, onCancel }) => {
  const [formData, setFormData] = useState<Partial<OrderItem>>({
    quantity: 1,
    color: COLORS[0].name,
    printPlaces: [],
    images: [],
    printImages: {},
    players: [],
    gender: 'Мальчик',
    size: 'M',
    sleeve: 'Короткий',
    fabric: FABRICS[0],
    wishes: ''
  });
  
  const [uploadingZones, setUploadingZones] = useState<Set<string>>(new Set());
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [multiColorSelections, setMultiColorSelections] = useState<Record<string, number>>({});
  const [multiSizeSelections, setMultiSizeSelections] = useState<Record<string, number>>({});
  const [tips, setTips] = useState<string | null>(null);
  const [schoolSearch, setSchoolSearch] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isMultiColorMode = initialSubtype === OrderSubtype.SCHOOL && (productType === ProductType.TSHIRT || productType === ProductType.HOODIE);
  const isMultiSizeMode = initialSubtype === OrderSubtype.PERSONAL && (productType === ProductType.TSHIRT || productType === ProductType.HOODIE);
  const isTeamMode = initialSubtype === OrderSubtype.TEAM;

  const totalMultiSizeQty = Object.values(multiSizeSelections).reduce((acc, qty) => acc + qty, 0);

  useEffect(() => {
    let defaultPrintPlaces: string[] = [];
    if (initialSubtype === OrderSubtype.SCHOOL) defaultPrintPlaces = ['Спереди'];

    if (productType === ProductType.CAP) {
        setFormData(prev => ({ ...prev, capType: CapType.BASEBALL, printPlaces: ['Спереди'] }));
    } else if (productType === ProductType.HOODIE) {
        setFormData(prev => ({ ...prev, hoodieType: HoodieType.KANGAROO, printPlaces: defaultPrintPlaces, sleeve: 'Длинный', gender: 'Универсальный' }));
    } else if (productType === ProductType.TANK_TOP) {
        setFormData(prev => ({ ...prev, sleeve: 'Без рукавов', printPlaces: defaultPrintPlaces }));
    } else if (initialSubtype === OrderSubtype.PERSONAL && productType === ProductType.TSHIRT) {
        setFormData(prev => ({ ...prev, printPlaces: defaultPrintPlaces, sleeve: 'Короткий', gender: 'Универсальный' }));
    } else {
        setFormData(prev => ({ ...prev, printPlaces: defaultPrintPlaces, sleeve: 'Короткий' }));
    }
    getDesignFeedback(productType, initialSubtype).then(res => setTips(res || null));
  }, [productType, initialSubtype]);

  const processFile = (place: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, загрузите изображение.');
      return;
    }
    
    setUploadingZones(prev => new Set(prev).add(place));
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({
        ...prev,
        printPlaces: prev.printPlaces?.includes(place) ? prev.printPlaces : [...(prev.printPlaces || []), place],
        printImages: { ...(prev.printImages || {}), [place]: base64 }
      }));
      setUploadingZones(prev => {
        const next = new Set(prev);
        next.delete(place);
        return next;
      });
    };
    reader.onerror = () => {
      setUploadingZones(prev => {
        const next = new Set(prev);
        next.delete(place);
        return next;
      });
      alert('Ошибка при чтении файла.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (place: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(place, file);
  };

  const handleDragOver = (e: React.DragEvent, place: string) => {
    e.preventDefault();
    setDragOverZone(place);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverZone(null);
  };

  const handleDrop = (e: React.DragEvent, place: string) => {
    e.preventDefault();
    setDragOverZone(null);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(place, file);
  };

  const removePrintImage = (place: string) => {
    setFormData(prev => {
      const newImages = { ...prev.printImages };
      delete newImages[place];
      return {
        ...prev,
        printPlaces: prev.printPlaces?.filter(p => p !== place),
        printImages: newImages
      };
    });
  };

  const updateMultiSizeQty = (sizeName: string, delta: number) => {
    setMultiSizeSelections(prev => {
      const current = prev[sizeName] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) delete updated[sizeName];
      else updated[sizeName] = next;
      return updated;
    });
  };

  const handleAdd = () => {
    const allImages = Object.values(formData.printImages || {});
    if (isMultiColorMode) {
      const colors = Object.keys(multiColorSelections);
      if (colors.length === 0) return;
      const items = colors.map(colorName => ({
        ...formData, id: Math.random().toString(36).substr(2, 9),
        type: productType, subtype: initialSubtype, color: colorName,
        quantity: multiColorSelections[colorName], images: allImages
      } as OrderItem));
      onAddToCart(items);
    } else if (isMultiSizeMode) {
      const sizes = Object.keys(multiSizeSelections);
      if (sizes.length === 0) return;
      const items = sizes.map(sizeName => ({
        ...formData, id: Math.random().toString(36).substr(2, 9),
        type: productType, subtype: initialSubtype, size: sizeName,
        quantity: multiSizeSelections[sizeName], images: allImages
      } as OrderItem));
      onAddToCart(items);
    } else {
      onAddToCart({ ...formData, id: Math.random().toString(36).substr(2, 9), type: productType, subtype: initialSubtype, images: allImages } as OrderItem);
    }
  };

  const getAvailablePrintZones = () => {
    if (productType === ProductType.CAP) return ['Спереди'];
    if (productType === ProductType.TANK_TOP) return ['Спереди', 'Сзади'];
    return PRINT_PLACES;
  };

  return (
    <div className="bg-white rounded-[40px] p-10 shadow-2xl max-w-3xl mx-auto border border-gray-50">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">{initialSubtype}</h2>
          <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest mt-1">
            {productType === ProductType.TSHIRT ? 'Футболка' : productType === ProductType.HOODIE ? 'Худи' : productType === ProductType.CAP ? 'Шапка' : 'Майка'}
          </p>
        </div>
        <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors">✕</button>
      </div>

      <div className="space-y-10">
        {tips && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6">
             <div className="flex items-center gap-2 mb-3">
               <span className="text-lg">✨</span>
               <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Советы по дизайну</h4>
             </div>
             <div className="text-xs text-indigo-900/80 leading-relaxed font-medium space-y-1">
               {tips.split('\n').map((line, i) => <p key={i}>{line.trim()}</p>)}
             </div>
          </div>
        )}

        {(productType === ProductType.HOODIE || productType === ProductType.CAP) && !isTeamMode && (
          <div className="animate-in slide-in-from-left-4 duration-400">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Модель {productType === ProductType.CAP ? 'кепки' : 'худи'}</label>
            <div className="flex flex-wrap gap-2">
              {productType === ProductType.HOODIE ? 
                [HoodieType.KANGAROO, HoodieType.ZIP, HoodieType.SWEATER].map(t => (
                  <button key={t} onClick={() => setFormData({ ...formData, hoodieType: t })} className={`px-6 h-12 rounded-2xl font-black text-[11px] uppercase border-2 transition-all ${formData.hoodieType === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-50 bg-gray-50 text-gray-300'}`}>{t === HoodieType.KANGAROO ? 'Кенгуру' : t === HoodieType.ZIP ? 'На молнии' : 'Свитшот'}</button>
                )) :
                [CapType.BASEBALL, CapType.SNAPBACK, CapType.BEANIE].map(t => (
                  <button key={t} onClick={() => setFormData({ ...formData, capType: t })} className={`px-6 h-12 rounded-2xl font-black text-[11px] uppercase border-2 transition-all ${formData.capType === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-50 bg-gray-50 text-gray-300'}`}>{t === CapType.BASEBALL ? 'Бейсболка' : t === CapType.SNAPBACK ? 'Снэпбек' : 'Бини'}</button>
                ))
              }
            </div>
          </div>
        )}

        {isTeamMode && productType === ProductType.TSHIRT && (
          <div className="animate-in slide-in-from-left-4 duration-400">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Выбор ткани</label>
            <div className="flex gap-3">
              {FABRICS.map(f => (
                <button
                  key={f}
                  onClick={() => setFormData({ ...formData, fabric: f })}
                  className={`flex-1 h-14 rounded-2xl font-black text-[12px] uppercase border-2 transition-all ${
                    formData.fabric === f 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                      : 'border-gray-50 bg-gray-50 text-gray-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Секция загрузки макетов для Личного Дизайна: Всегда 4 зоны для T-shirt/Hoodie */}
        {initialSubtype === OrderSubtype.PERSONAL ? (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Загрузите макеты для зон печати</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {getAvailablePrintZones().map(place => {
                const hasImage = !!formData.printImages?.[place];
                const isUploading = uploadingZones.has(place);
                const isDragOver = dragOverZone === place;

                return (
                  <div 
                    key={place} 
                    onDragOver={(e) => handleDragOver(e, place)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, place)}
                    className={`bg-gray-50 p-6 rounded-[32px] border-2 transition-all group flex flex-col items-center text-center relative ${
                      isDragOver ? 'border-dashed border-indigo-400 bg-indigo-50/80 scale-105' : 
                      hasImage ? 'border-indigo-500 bg-indigo-50 shadow-lg' : 'border-gray-100 hover:border-indigo-200'
                    }`}
                  >
                    <div className="w-full flex justify-between items-start mb-4">
                       <span className={`text-[10px] font-black uppercase tracking-widest ${hasImage ? 'text-indigo-600' : 'text-gray-400'}`}>{place}</span>
                       {hasImage && !isUploading && (
                         <button onClick={() => removePrintImage(place)} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest">Удалить</button>
                       )}
                    </div>
                    
                    <div className="w-32 h-32 mb-6 bg-white rounded-[32px] shadow-inner border border-gray-100 flex items-center justify-center overflow-hidden relative group-hover:scale-105 transition-transform">
                       {isUploading ? (
                         <div className="flex flex-col items-center gap-2">
                           <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                           <span className="text-[8px] font-black text-indigo-400 uppercase">Обработка...</span>
                         </div>
                       ) : hasImage ? (
                         <img src={formData.printImages?.[place]} alt={place} className="w-full h-full object-cover" />
                       ) : (
                         <div className="flex flex-col items-center opacity-30">
                           <span className="text-4xl mb-2">📥</span>
                           <span className="text-[8px] font-black uppercase leading-none">Перетащите сюда</span>
                         </div>
                       )}
                    </div>

                    <input type="file" accept="image/*" className="hidden" ref={el => { fileInputRefs.current[place] = el; }} onChange={(e) => handleFileUpload(place, e)} />
                    <button 
                      disabled={isUploading}
                      onClick={() => fileInputRefs.current[place]?.click()}
                      className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        isUploading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                        hasImage ? 'bg-white text-indigo-600 border border-indigo-100' : 'bg-indigo-600 text-white shadow-md'
                      }`}
                    >
                      {isUploading ? 'Загрузка...' : hasImage ? 'Заменить файл' : 'Выбрать макет'}
                    </button>
                    {!hasImage && !isUploading && (
                      <p className="mt-3 text-[9px] text-gray-400 font-bold uppercase opacity-50">PNG, JPG до 5MB</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : initialSubtype === OrderSubtype.SCHOOL && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Выберите школу</label>
            <div className="mb-6">
              <input type="text" placeholder="Поиск по названию школы..." className="w-full h-14 px-6 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-500 transition-all text-sm font-medium" value={schoolSearch} onChange={(e) => setSchoolSearch(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {SCHOOL_LIST.filter(s => s.name.toLowerCase().includes(schoolSearch.toLowerCase())).map(school => (
                <div key={school.id} onClick={() => setFormData({ ...formData, school: school.name })} className={`cursor-pointer group flex flex-col items-center p-4 rounded-[28px] border-2 transition-all ${formData.school === school.name ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-[1.02]' : 'border-gray-50 bg-gray-50 hover:border-indigo-200'}`}>
                  <div className="w-16 h-16 mb-3 bg-white rounded-2xl p-2 shadow-sm flex items-center justify-center overflow-hidden"><img src={school.logo} alt={school.name} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform" /></div>
                  <span className={`text-[10px] text-center font-black uppercase tracking-tighter leading-tight ${formData.school === school.name ? 'text-indigo-700' : 'text-gray-400'}`}>{school.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {productType !== ProductType.CAP && 
         productType !== ProductType.TANK_TOP && 
         productType !== ProductType.HOODIE && 
         !isTeamMode && 
         initialSubtype !== OrderSubtype.PERSONAL && (
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Для кого</label>
            <div className="flex gap-3">
              {['Мальчик', 'Девочка'].map(g => (
                <button key={g} onClick={() => setFormData({ ...formData, gender: g as any })} className={`flex-1 h-14 rounded-2xl font-black text-[12px] uppercase border-2 transition-all ${formData.gender === g ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-gray-50 bg-gray-50 text-gray-300'}`}>{g === 'Мальчик' ? 'Мальчики' : 'Девочки'}</button>
              ))}
            </div>
          </div>
        )}

        {productType === ProductType.TSHIRT && !isTeamMode && (
          <div className="animate-in slide-in-from-left-4 duration-400">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Длина рукава</label>
            <div className="flex flex-wrap gap-2">
              {(initialSubtype === OrderSubtype.PERSONAL 
                ? SLEEVES.BOY 
                : (formData.gender === 'Девочка' ? SLEEVES.GIRL : SLEEVES.BOY)
              ).map(s => (
                <button key={s} onClick={() => setFormData({ ...formData, sleeve: s })} className={`px-6 h-12 rounded-2xl font-black text-[11px] uppercase border-2 transition-all ${formData.sleeve === s ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-gray-50 bg-gray-50 text-gray-300 hover:border-gray-200'}`}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {!isTeamMode && (
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Размеры</label>
            <div className="flex flex-wrap gap-2">
              {(isMultiSizeMode ? [...PERSONAL_SIZES_KIDS, ...PERSONAL_SIZES_ADULTS] : (initialSubtype === OrderSubtype.SCHOOL ? [...SCHOOL_SIZES_KIDS, ...SCHOOL_SIZES_ADULTS] : [...PERSONAL_SIZES_KIDS, ...PERSONAL_SIZES_ADULTS])).map(size => {
                const isSelected = isMultiSizeMode ? (multiSizeSelections[size] || 0) > 0 : formData.size === size;
                return (
                  <button key={size} onClick={() => isMultiSizeMode ? updateMultiSizeQty(size, 1) : setFormData({ ...formData, size })} onContextMenu={(e) => { e.preventDefault(); if(isMultiSizeMode) updateMultiSizeQty(size, -1); }} className={`min-w-[54px] h-[54px] rounded-2xl font-bold text-sm transition-all flex flex-col items-center justify-center relative ${isSelected ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                    {size}
                    {isMultiSizeMode && (multiSizeSelections[size] || 0) > 0 && <span className="absolute -top-2 -right-2 bg-indigo-200 text-indigo-900 text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{multiSizeSelections[size]}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Цвет изделия {isMultiColorMode ? '(выберите несколько)' : ''}</label>
          <div className="grid grid-cols-5 gap-3">
            {COLORS.map(c => {
              const isSelected = isMultiColorMode ? !!multiColorSelections[c.name] : formData.color === c.name;
              return (
                <button key={c.hex} onClick={() => isMultiColorMode ? setMultiColorSelections(p => ({...p, [c.name]: p[c.name] ? p[c.name] : 1})) : setFormData({ ...formData, color: c.name })} className={`aspect-square rounded-[24px] transition-all relative flex items-center justify-center ${isSelected ? 'ring-4 ring-indigo-500 ring-offset-4 scale-[1.05]' : 'hover:scale-[1.02]'}`} style={{ backgroundColor: c.hex, border: c.hex === '#FFFFFF' ? '1px solid #e5e7eb' : 'none' }}>
                  {isSelected && <div className={`w-8 h-8 rounded-full flex items-center justify-center ${c.hex === '#FFFFFF' ? 'bg-indigo-600' : 'bg-white'}`}>{isMultiColorMode ? <span className={`${c.hex === '#FFFFFF' ? 'text-white' : 'text-gray-900'} font-black text-xs`}>{multiColorSelections[c.name]}</span> : <span className={`${c.hex === '#FFFFFF' ? 'text-white' : 'text-gray-900'} font-black text-lg`}>✓</span>}</div>}
                </button>
              );
            })}
          </div>
          {isMultiColorMode && Object.keys(multiColorSelections).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
               {Object.entries(multiColorSelections).map(([cName, qty]) => (
                 <div key={cName} className="flex items-center justify-between bg-gray-50/50 p-4 rounded-[24px] border border-gray-100 shadow-sm">
                    <span className="text-[13px] font-black text-gray-700 uppercase">{cName}</span>
                    <div className="flex items-center bg-white/80 rounded-xl p-1 gap-4">
                       <button onClick={() => setMultiColorSelections(p => { const n = {...p}; if(qty <= 1) delete n[cName]; else n[cName] = qty-1; return n; })} className="w-8 h-8 flex items-center justify-center font-bold text-lg">−</button>
                       <span className="text-sm font-black">{qty}</span>
                       <button onClick={() => setMultiColorSelections(p => ({...p, [cName]: qty+1}))} className="w-8 h-8 flex items-center justify-center font-bold text-lg">+</button>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>

        {isTeamMode && <PlayerTable players={formData.players || []} onChange={(players) => setFormData({ ...formData, players })} productType={productType} />}

        <div className="animate-in slide-in-from-bottom-4 duration-400">
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Ваши пожелания к этому изделию</label>
          <textarea 
            value={formData.wishes}
            onChange={(e) => setFormData({ ...formData, wishes: e.target.value })}
            placeholder="Напишите здесь любые детали или уточнения по заказу этого товара..."
            className="w-full h-32 p-6 bg-gray-50 border border-gray-100 rounded-[32px] outline-none focus:bg-white focus:border-indigo-400 transition-all text-sm font-medium resize-none shadow-inner"
          />
        </div>
      </div>

      <div className="mt-14 flex flex-col items-center">
        {(isMultiSizeMode || isMultiColorMode) && <p className="mb-6 text-sm font-black text-gray-400 uppercase tracking-widest">Итого: <span className="text-indigo-600 font-black text-lg">{isMultiSizeMode ? totalMultiSizeQty : Object.values(multiColorSelections).reduce((a, b) => a + b, 0)} шт.</span></p>}
        <Button onClick={handleAdd} variant="primary" size="lg" fullWidth className="h-16 rounded-3xl font-black text-[14px] uppercase tracking-[0.1em] shadow-xl hover:shadow-indigo-200" disabled={(initialSubtype === OrderSubtype.SCHOOL && !formData.school) || (isMultiSizeMode && totalMultiSizeQty === 0) || (isMultiColorMode && Object.keys(multiColorSelections).length === 0) || (isTeamMode && !formData.players?.length) || (initialSubtype === OrderSubtype.PERSONAL && formData.printPlaces?.length === 0)}>
          {formData.id ? 'Обновить данные' : 'Добавить в корзину'}
        </Button>
      </div>
    </div>
  );
};

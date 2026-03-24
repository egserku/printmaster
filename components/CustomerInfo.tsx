
import React, { useState } from 'react';
import { CustomerData } from '../types';
import { Button } from './ui/Button';

interface CustomerInfoProps {
  onSubmit: (data: CustomerData) => void;
  onBack: () => void;
}

export const CustomerInfo: React.FC<CustomerInfoProps> = ({ onSubmit, onBack }) => {
  const [data, setData] = useState<CustomerData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    comments: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CustomerData, string>>>({});

  const validate = () => {
    const newErrors: any = {};
    if (!data.name) newErrors.name = 'Имя обязательно';
    if (!data.phone) newErrors.phone = 'Телефон обязателен';
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) newErrors.email = 'Некорректный email';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(data);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Контактные данные</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">ФИО *</label>
          <input 
            type="text" 
            className={`w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 ring-indigo-400 ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
            value={data.name}
            onChange={e => setData({...data, name: e.target.value})}
            placeholder="Иван Иванов"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Телефон *</label>
            <input 
              type="tel" 
              className={`w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 ring-indigo-400 ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}
              value={data.phone}
              onChange={e => setData({...data, phone: e.target.value})}
              placeholder="+7 (___) ___ __ __"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email *</label>
            <input 
              type="email" 
              className={`w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 ring-indigo-400 ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
              value={data.email}
              onChange={e => setData({...data, email: e.target.value})}
              placeholder="example@mail.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Адрес доставки</label>
          <input 
            type="text" 
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none"
            value={data.address}
            onChange={e => setData({...data, address: e.target.value})}
            placeholder="Город, улица, дом..."
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Комментарий к заказу</label>
          <textarea 
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none h-24"
            value={data.comments}
            onChange={e => setData({...data, comments: e.target.value})}
            placeholder="Любые пожелания..."
          />
        </div>
        <div className="flex gap-4 pt-4">
          <Button onClick={onBack} variant="outline" fullWidth type="button">Назад к товарам</Button>
          <Button variant="primary" fullWidth type="submit">Подтвердить заказ</Button>
        </div>
      </form>
    </div>
  );
};

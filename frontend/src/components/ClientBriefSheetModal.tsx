import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, ExternalLink, Save, Copy, Check,
  Loader2, AlertCircle, CheckCircle2, Download
} from 'lucide-react';
import type { Client, ClientBriefSheetData } from '../types';
import { fetchClientBriefSheet, updateClientBriefSheet } from '../services/api';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';

interface ClientBriefSheetModalProps {
  client: Client;
  onClose: () => void;
}

export const ClientBriefSheetModal: React.FC<ClientBriefSheetModalProps> = ({
  client,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [sheetData, setSheetData] = useState<ClientBriefSheetData | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchClientBriefSheet(client.id);
      setSheetData(data);
      setFormValues(data.raw_data || {});
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات شيت العميل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [client.id]);

  const handleChange = (key: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const updated = await updateClientBriefSheet(client.id, formValues);
      setSheetData(updated);
      setFormValues(updated.raw_data || {});
      setSuccessMsg('تم حفظ وتحديث شيت بيانات العميل بنجاح!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ الشيت');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyAll = () => {
    if (!sheetData) return;
    let text = `📊 شيت بيانات واستراتيجية العميل: ${client.company_name}\n`;
    text += `العميل: ${client.name} | التاريخ: ${new Date().toLocaleDateString('ar-EG')}\n`;
    text += `رابط المجلد / الشيت: ${sheetData.sheet_url || client.drive_folder_url}\n`;
    text += `--------------------------------------------------\n\n`;

    sheetData.fields.forEach(field => {
      const val = formValues[field.key] || 'غير محدد';
      text += `📌 ${field.title}\n${val}\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    if (!sheetData) return;
    const headers = sheetData.fields.map(f => `"${f.title.replace(/"/g, '""')}"`).join(',');
    const values = sheetData.fields.map(f => `"${(formValues[f.key] || '').replace(/"/g, '""')}"`).join(',');
    const csvContent = '\uFEFF' + headers + '\n' + values;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `شيت_بيانات_${client.company_name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLink = (val?: string) => {
    return val && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('drive.google.com'));
  };

  const sheetUrl = sheetData?.sheet_url || client.sheet_url;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      maxWidth="4xl"
      title={`شيت استراتيجية العميل - ${client.company_name}`}
      description="شيت بيانات المتجر واستراتيجية التسويق والبريف المعتمد"
      icon={<FileSpreadsheet className="w-5 h-5 text-emerald-400" />}
      footer={
        <div className="flex items-center justify-between w-full flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح في Google Sheets ↗</span>
              </a>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportCSV}
            >
              تصدير CSV
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              onClick={handleCopyAll}
            >
              {copied ? 'تم النسخ' : 'نسخ الملخص'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={saving}
            >
              إغلاق
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={saving}
              onClick={handleSave}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-xs text-slate-400">جاري جلب بيانات شيت العميل...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-4">
          
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Brand & Domain */}
          <Card>
            <CardHeader className="py-3 px-4">
              <h3 className="font-bold text-xs text-indigo-300">١. الهوية والنطاق والمنصة</h3>
            </CardHeader>
            <CardBody className="p-4 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    ١ـ فايل الهوية البصرية (اللوجو PNG بكوالتي عالي وخلفية شفافة):
                  </label>
                  {isLink(formValues['logo_brand_file']) && (
                    <a
                      href={formValues['logo_brand_file']}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>فتح الرابط ↗</span>
                    </a>
                  )}
                </div>
                <Input
                  dir="ltr"
                  value={formValues['logo_brand_file'] || ''}
                  onChange={(e) => handleChange('logo_brand_file', e.target.value)}
                  placeholder="https://drive.google.com/... أو رابط مباشر"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    ٢ـ لينك الموقع أو المتجر الإلكتروني:
                  </label>
                  <Input
                    dir="ltr"
                    value={formValues['website_url'] || ''}
                    onChange={(e) => handleChange('website_url', e.target.value)}
                    placeholder="https://store.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    ٣ـ المنصة والثيم المفعل:
                  </label>
                  <Input
                    value={formValues['platform_theme'] || ''}
                    onChange={(e) => handleChange('platform_theme', e.target.value)}
                    placeholder="مثال: سلة - قالب راقي"
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Section 2: Products & Catalog */}
          <Card>
            <CardHeader className="py-3 px-4">
              <h3 className="font-bold text-xs text-indigo-300">٢. المنتجات والتصنيفات (Catalog)</h3>
            </CardHeader>
            <CardBody className="p-4 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    ٤ـ فايل المنتجات بكوالتي عالي مصنفة حسب كل قسم:
                  </label>
                  {isLink(formValues['products_file']) && (
                    <a
                      href={formValues['products_file']}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>فتح مجلد المنتجات ↗</span>
                    </a>
                  )}
                </div>
                <Input
                  dir="ltr"
                  value={formValues['products_file'] || ''}
                  onChange={(e) => handleChange('products_file', e.target.value)}
                  placeholder="رابط مجلد Google Drive أو ملف إكسيل للمنتجات"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    ٥ـ التصنيفات أو الأقسام الرئيسية والفرعية (السايلو):
                  </label>
                  <Textarea
                    rows={2}
                    value={formValues['categories_silo'] || ''}
                    onChange={(e) => handleChange('categories_silo', e.target.value)}
                    placeholder="مثال: العطور الرجالية > عطور العود، العطور النسائية..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    ٩- المنتجات الأكثر مبيعاً (Best Sellers):
                  </label>
                  <Textarea
                    rows={2}
                    value={formValues['best_sellers'] || ''}
                    onChange={(e) => handleChange('best_sellers', e.target.value)}
                    placeholder="أهم 3 إلى 5 منتجات مبيعاً وطلباً..."
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Section 3: Value Proposition & Offers */}
          <Card>
            <CardHeader className="py-3 px-4">
              <h3 className="font-bold text-xs text-indigo-300">٣. العروض والميزة التنافسية والمنتج البطل</h3>
            </CardHeader>
            <CardBody className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    ٦ـ العروض والتخفيضات الحالية:
                  </label>
                  <Textarea
                    rows={2}
                    value={formValues['offers_discounts'] || ''}
                    onChange={(e) => handleChange('offers_discounts', e.target.value)}
                    placeholder="كود الخصم، عروض اشتر 1 واحصل على 1..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    ٧ـ ميز البيع التنافسية (USPs):
                  </label>
                  <Textarea
                    rows={2}
                    value={formValues['selling_advantages'] || ''}
                    onChange={(e) => handleChange('selling_advantages', e.target.value)}
                    placeholder="شحن مجاني، تقسيط تابي وتمارا، ضمان ذهبي..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  ١٠- منتج معين حابب نستخدمه في التصاميم أو نبرزه أكثر (Hero Product):
                </label>
                <Input
                  value={formValues['featured_product'] || ''}
                  onChange={(e) => handleChange('featured_product', e.target.value)}
                  placeholder="اسم أو رابط المنتج البطل المراد إبرازه في البانرات والإعلانات"
                />
              </div>
            </CardBody>
          </Card>

          {/* Section 4: Competitors & Art Direction */}
          <Card>
            <CardHeader className="py-3 px-4">
              <h3 className="font-bold text-xs text-indigo-300">٤. المنافسون والتوجه الفني</h3>
            </CardHeader>
            <CardBody className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  ٨- لينكات المنافسين إن وُجد:
                </label>
                <Textarea
                  rows={2}
                  dir="ltr"
                  value={formValues['competitors_links'] || ''}
                  onChange={(e) => handleChange('competitors_links', e.target.value)}
                  placeholder="https://competitor1.com&#10;https://competitor2.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  ١١- لو في استايل أو توجه معين حابب نصمم زيه؟ (Design Style):
                </label>
                <Textarea
                  rows={2}
                  value={formValues['design_style'] || ''}
                  onChange={(e) => handleChange('design_style', e.target.value)}
                  placeholder="التوجه الفني، لوحة الألوان المفضلة، روابط أعمال ملهمة (References)..."
                />
              </div>
            </CardBody>
          </Card>

        </div>
      )}
    </Modal>
  );
};

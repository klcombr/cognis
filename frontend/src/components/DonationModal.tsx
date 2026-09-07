import { useState } from 'react';
import { api } from '../lib/api';
import type { Donation } from '../types';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AMOUNTS = [5, 10, 25, 50, 100];

export function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const [amount, setAmount] = useState(10);
  const [name, setName] = useState('');
  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDonate = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.createDonation(amount, name);
      setDonation(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar doação');
    } finally {
      setLoading(false);
    }
  };

  const copyPix = () => {
    if (donation?.pix_copy_paste) {
      navigator.clipboard.writeText(donation.pix_copy_paste);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="card bg-white border-2 border-text p-6 max-w-md w-full mx-4 shadow-[8px_8px_0_#111]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-extrabold text-text">Apoie o Cognis</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text font-bold text-xl">&times;</button>
        </div>

        {!donation ? (
          <>
            <p className="text-sm font-semibold text-text-secondary mb-4">
              O Cognis é gratuito e sem anúncios. Se gosta do projeto, considere apoiar com qualquer valor em Pix.
            </p>
            <div className="mb-4">
              <label className="text-xs font-extrabold text-text-muted uppercase font-mono mb-2 block">Valor (R$)</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_AMOUNTS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className={`px-3 py-2 text-sm font-extrabold border-2 rounded-sm ${
                      amount === v
                        ? 'bg-text text-white border-text'
                        : 'border-text text-text hover:bg-surface-alt'
                    }`}
                  >
                    R$ {v}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border-2 border-text rounded-sm text-sm font-extrabold text-text"
              />
            </div>
            <div className="mb-4">
              <label className="text-xs font-extrabold text-text-muted uppercase font-mono mb-2 block">Nome (opcional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-3 py-2 border-2 border-text rounded-sm text-sm font-semibold text-text"
              />
            </div>
            {error && <p className="text-xs font-bold text-red-600 mb-3">{error}</p>}
            <button
              onClick={handleDonate}
              disabled={loading || amount < 1}
              className="w-full btn btn-primary py-3 text-sm font-extrabold rounded-sm disabled:opacity-50"
            >
              {loading ? 'Gerando...' : `Doar R$ ${amount} via Pix`}
            </button>
          </>
        ) : donation.status === 'APPROVED' ? (
          <div className="text-center py-6">
            <p className="text-green-600 font-extrabold text-lg mb-2">Obrigado!</p>
            <p className="text-sm font-semibold text-text-secondary">Sua doação foi confirmada.</p>
            <button onClick={onClose} className="mt-4 btn btn-ghost text-sm font-extrabold">Fechar</button>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-text-secondary mb-4">Escaneie o QR Code ou copie o Pix:</p>
            {donation.qr_code && (
              <div className="flex justify-center mb-4">
                <img src={donation.qr_code} alt="QR Code Pix" className="w-48 h-48 border-2 border-text" />
              </div>
            )}
            {donation.pix_copy_paste && (
              <div className="mb-4">
                <label className="text-xs font-extrabold text-text-muted uppercase font-mono mb-1 block">Copiar código</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={donation.pix_copy_paste}
                    className="flex-1 px-2 py-2 border-2 border-text rounded-sm text-[10px] font-mono text-text bg-surface"
                  />
                  <button onClick={copyPix} className="btn btn-primary px-4 py-2 text-xs font-extrabold rounded-sm">Copiar</button>
                </div>
              </div>
            )}
            {donation.payment_url && (
              <a
                href={donation.payment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center btn btn-ghost border-2 border-text py-2 text-sm font-extrabold rounded-sm mb-3"
              >
                Abrir link de pagamento
              </a>
            )}
            <p className="text-[10px] font-bold text-text-muted text-center">
              Acompanhe o status automaticamente. O QR expira em 30 minutos.
            </p>
            <button onClick={onClose} className="w-full mt-4 btn btn-ghost py-2 text-sm font-extrabold rounded-sm">
              Fechar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
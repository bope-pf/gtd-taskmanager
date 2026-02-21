import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { registerPin, verifyPin } from '../../api/syncApi';

interface PinAuthModalProps {
  isOpen: boolean;
  onAuthenticated: () => void;
  onSkip: () => void;
}

export function PinAuthModal({ isOpen, onAuthenticated, onSkip }: PinAuthModalProps) {
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'choose' | 'register' | 'login'>('choose');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('6桁の数字を入力してください');
      return;
    }

    setLoading(true);
    setError('');

    const result = await registerPin(pin);
    setLoading(false);

    if (result.success) {
      localStorage.setItem('gtd_pin', pin);
      onAuthenticated();
    } else {
      setError(result.message);
    }
  }

  async function handleLogin() {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('6桁の数字を入力してください');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verifyPin(pin);
    setLoading(false);

    if (result.success && result.data?.valid) {
      localStorage.setItem('gtd_pin', pin);
      onAuthenticated();
    } else {
      setError('PINが正しくありません');
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onSkip} title="データ同期の設定" size="sm">
      <div className="space-y-4">
        {mode === 'choose' ? (
          <>
            <p className="text-sm text-gray-600">
              6桁のPINコードを設定すると、複数の端末間でデータを同期できます。
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setMode('register')}
                className="w-full px-4 py-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                新しいPINを登録する
              </button>
              <button
                onClick={() => setMode('login')}
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                既存のPINでログイン
              </button>
              <button
                onClick={onSkip}
                className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                あとで設定する（オフラインで使用）
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              {mode === 'register' ? '新しい6桁のPINを設定してください:' : 'PINを入力してください:'}
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPin(val);
                setError('');
              }}
              className="w-full text-center text-2xl tracking-[0.5em] border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="000000"
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setMode('choose'); setPin(''); setError(''); }}
                className="flex-1 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                戻る
              </button>
              <button
                onClick={mode === 'register' ? handleRegister : handleLogin}
                disabled={loading || pin.length !== 6}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '処理中...' : mode === 'register' ? '登録' : 'ログイン'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

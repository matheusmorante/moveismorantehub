import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-native', () => {
  const view = ({ children }: any) => <div>{children}</div>;
  return { View: view, Text: ({ children }: any) => <span>{children}</span>, TextInput: ({ value, onChangeText }: any) => <input value={value} onChange={event => onChangeText(event.target.value)} />,
    TouchableOpacity: ({ children, onPress, disabled, accessibilityLabel }: any) => <button onClick={onPress} disabled={disabled} aria-label={accessibilityLabel}>{children}</button>,
    StyleSheet: { create: (styles: unknown) => styles }, useWindowDimensions: () => ({ width: 400, height: 800 }), PanResponder: { create: () => ({ panHandlers: {} }) },
    Animated: { View: view, ValueXY: class { setValue() {} getTranslateTransform() { return []; } } } };
});
vi.mock('lucide-react-native', () => ({ AudioLines: () => null, Send: () => null, Mic: () => null, MicOff: () => null, Pause: () => null, Play: () => null, X: () => null }));
import { FinancialChatInputBar } from '../../../mobile/src/features/finance/components/chat/FinancialChatInputBar';
import { GeminiLiveOrb } from '../../../mobile/src/features/finance/components/chat/GeminiLiveOrb';
afterEach(() => cleanup());
describe('controles visuais de voz do formulário', () => {
  it('bloqueia nova chamada durante submissão e libera após terminar', () => {
    const props = { inputText: '', loading: true, onChangeInputText: vi.fn(), onSendMessage: vi.fn(), onStartLive: vi.fn() }; const view = render(<FinancialChatInputBar {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Voice Mode' })); expect(props.onStartLive).not.toHaveBeenCalled();
    view.rerender(<FinancialChatInputBar {...props} loading={false} />); fireEvent.click(screen.getByRole('button', { name: 'Voice Mode' })); expect(props.onStartLive).toHaveBeenCalledTimes(1);
  });
  it('bloqueia pausa e mute durante início, mantendo encerramento acessível', () => {
    const props = { active: true, paused: false, muted: false, remainingMs: 5000, busy: true, onPause: vi.fn(), onMute: vi.fn(), onEnd: vi.fn() }; render(<GeminiLiveOrb {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Controles Gemini Live' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pausar conversa' })); fireEvent.click(screen.getByRole('button', { name: 'Silenciar microfone' })); expect(props.onPause).not.toHaveBeenCalled(); expect(props.onMute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar chamada' })); expect(props.onEnd).toHaveBeenCalledTimes(1);
  });
});

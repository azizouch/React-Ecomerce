import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type Category = {
  id: string;
  label: string;
  emojis: string[];
};

type Props = {
  anchorRef: React.RefObject<HTMLElement>;
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  recent?: string[];
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'classic', label: 'All', emojis: ['😀','😂','😍','😢','😡','👍','👎','🎉','❤️','😎','🔥','✨','🎂','📱','🌟','😴','🚀','⭐','🎈','🎊','💯','🔔','📌','⚡'] },
  { id: 'animals', label: 'Animals', emojis: ['🐶','🐱','🐭','🦊','🐼','🦁','🐯','🐨','🐸','🐵'] },
  { id: 'food', label: 'Food', emojis: ['🍎','🍌','🍕','🍔','🍟','🍣','🍩','🍪','🍰','🍫'] },
];

export default function EmojiPicker({ anchorRef, visible, onSelect, onClose, recent = [] }: Props) {
  const [posStyle, setPosStyle] = useState<React.CSSProperties>({});
  const [activeCat, setActiveCat] = useState<string>('classic');
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const categories = useMemo(() => DEFAULT_CATEGORIES, []);

  useEffect(() => {
    function updatePosition() {
      const anchor = anchorRef.current;
      const rect = anchor?.getBoundingClientRect();
      const bottom = rect ? window.innerHeight - rect.top + 8 : 80; // distance from bottom

      // On large screens, display inline dropdown anchored above the button
      if (rect && window.innerWidth >= 1024) {
        const left = rect.left;
        const bottomAbove = window.innerHeight - rect.top + 8; // place above the anchor
        // compute width so it doesn't overflow the viewport with 16px side padding
        const maxWidth = Math.min(720, window.innerWidth - 32 - left);
        setPosStyle({ position: 'fixed', left: `${left}px`, bottom: `${bottomAbove}px`, width: `${maxWidth}px` });
        return;
      }

      // Small screens: center the panel above the input
      setPosStyle({ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: `${bottom}px`, width: 'min(720px, calc(100% - 32px))' });
    }

    if (visible) updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, visible]);

  // Close when clicking outside the panel or the anchor
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current && (panelRef.current.contains(target) || anchorRef.current?.contains(target))) {
        return;
      }
      onClose();
    }

    if (visible) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible, onClose, anchorRef]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (visible) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  if (!visible) return null;

  const activeCategory = categories.find(c => c.id === activeCat) || categories[0];

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Emoji picker"
      className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-2xl p-3 shadow-lg z-50 emoji-picker hide-scrollbar"
      style={posStyle}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCat(cat.id)}
              className={`px-3 py-1 rounded-full text-sm ${cat.id === activeCat ? 'bg-gray-100 dark:bg-slate-700' : 'bg-transparent'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="ml-2 text-xs text-gray-400">{recent.length > 0 ? 'Recent' : ''}</div>
      </div>

      {recent.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto hide-scrollbar">
          {recent.map((r) => (
            <button key={r} type="button" onClick={() => onSelect(r)} onMouseDown={e => e.preventDefault()} className="emoji-btn bg-transparent">
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="emoji-grid max-h-40 overflow-y-auto hide-scrollbar">
        {(activeCategory.emojis || []).map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            onMouseDown={(e) => e.preventDefault()}
            className="emoji-btn hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            aria-label={`Insert ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

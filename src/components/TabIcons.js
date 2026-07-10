import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

export function AlarmIcon({ color = '#707973', size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="13" r="8" stroke={color} strokeWidth="1.5" />
      <Path d="M12 9v4l2.5 1.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4.5 4.5l3 3M19.5 4.5l-3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function AddIcon({ color = '#707973', size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
      <Path d="M12 8v8M8 12h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function MosqueIcon({ color = '#707973', size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C8 5 7 8 7 11h10c0-3-1-6-5-9z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 18h16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M6 12h1M10 12h4M17 12h1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M7 11v7M12 11v7M17 11v7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M3 20c0-2 4-3 9-3s9 1 9 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function SettingsIcon({ color = '#707973', size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" />
      <Path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

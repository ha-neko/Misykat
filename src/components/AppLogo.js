import React from 'react';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function AppLogo({ size = 80, color = '#006B5E' }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="bgGrad" x1="0" y1="0" x2="100" y2="100">
          <Stop offset="0" stopColor={color} stopOpacity="0.08" />
          <Stop offset="1" stopColor={color} stopOpacity="0.2" />
        </LinearGradient>
        <LinearGradient id="cresGrad" x1="30" y1="20" x2="80" y2="80">
          <Stop offset="0" stopColor={color} />
          <Stop offset="1" stopColor="#E8B84B" />
        </LinearGradient>
      </Defs>

      <Circle cx="50" cy="50" r="48" fill="url(#bgGrad)" stroke={color} strokeWidth="1" strokeOpacity="0.3" />

      <G transform="translate(50,50) rotate(-20) translate(-50,-50)">
        <Path d="M62 18 A24 24 0 1 0 72 72 A30 30 0 1 1 62 18Z" fill="url(#cresGrad)" />
      </G>

      <Circle cx="72" cy="22" r="4.5" fill={color} />
      <G transform="translate(72,22)">
        <Path d="M0 -8 L1.5 -2 L7.5 -2 L2.5 1.5 L4 7.5 L0 4 L-4 7.5 L-2.5 1.5 L-7.5 -2 L-1.5 -2Z" fill={color} opacity="0.9" />
      </G>

      <G opacity="0.15">
        <Path d="M26 78 Q38 68 50 78 Q62 68 74 78" stroke={color} strokeWidth="1.5" fill="none" />
        <Path d="M26 83 Q38 73 50 83 Q62 73 74 83" stroke={color} strokeWidth="1.5" fill="none" />
        <Path d="M26 88 Q38 78 50 88 Q62 78 74 88" stroke={color} strokeWidth="1.5" fill="none" />
      </G>
    </Svg>
  );
}

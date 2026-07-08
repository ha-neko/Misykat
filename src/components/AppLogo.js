import React from 'react';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function AppLogo({ size = 80, color = '#00b894' }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="lg" x1="0" y1="0" x2="100" y2="100">
          <Stop offset="0" stopColor={color} stopOpacity="0.15" />
          <Stop offset="1" stopColor={color} stopOpacity="0.3" />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="50" r="46" fill="url(#lg)" />
      <Path
        d="M58 22 A22 22 0 1 0 68 68 A26 26 0 1 1 58 22Z"
        fill={color}
      />
      <Path
        d="M68 18 L70 24 L76 24 L71 28 L73 34 L68 30 L63 34 L65 28 L60 24 L66 24Z"
        fill={color}
        opacity="0.9"
      />
    </Svg>
  );
}

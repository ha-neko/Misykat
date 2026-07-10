import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

export function ShuffleIcon({ color = '#707973', size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" opacity="0.2" />
      <Path d="M21 2v7h-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 2l-6 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M3 22v-7h7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 22l6-6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M21 16v3a2 2 0 01-2 2h-4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M3 8V5a2 2 0 012-2h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M7 12h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function ScrollIcon({ color = '#707973', size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="2" width="16" height="20" rx="2" stroke={color} strokeWidth="1.5" />
      <Path d="M8 7h8M8 11h8M8 15h5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M12 19h1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function BookIcon({ color = '#707973', size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 3h7v9l-3.5-2L4 12V3z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 3h-7v9l3.5-2L20 12V3z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 21h16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M4 18h16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function SpeakerIcon({ color = '#707973', size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11 5L6 9H2v6h4l5 4V5z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18 7a8 8 0 010 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M20 4a12 12 0 010 16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function MoonIcon({ color = '#707973', size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SunriseIcon({ color = '#707973', size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="10" r="4" stroke={color} strokeWidth="1.5" />
      <Path d="M12 2v2M4.93 4.93l1.41 1.41M2 10h2M20 10h2M17.66 6.34l1.41-1.41" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M2 17h20M5 21h14M8 17a4 4 0 018 0" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SunIcon({ color = '#707973', size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.5" />
      <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M17.66 6.34l1.41-1.41" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function SunsetIcon({ color = '#707973', size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="10" r="5" stroke={color} strokeWidth="1.5" />
      <Path d="M12 2v3M7.76 5.76l1.06 1.06M3 12h2M19 12h2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M2 17h20M5 21h14M12 10v6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CrescentIcon({ color = '#707973', size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="18" cy="6" r="1.5" fill={color} />
    </Svg>
  );
}

export function StarIcon({ color = '#707973', size = 16 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M8 1L9.5 5.5H14L10.5 8.5L12 13L8 10L4 13L5.5 8.5L2 5.5H6.5Z" fill={color} />
    </Svg>
  );
}

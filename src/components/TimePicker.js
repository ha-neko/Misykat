import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Keyboard,
} from 'react-native';

function HoldArrow({ onStep, children, st }) {
  const timer = useRef(null);
  const onStepRef = useRef(onStep);
  useEffect(() => { onStepRef.current = onStep; }, [onStep]);

  const handlePressIn = () => {
    onStepRef.current();
    timer.current = setInterval(() => onStepRef.current(), 120);
  };

  const handlePressOut = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  };

  return (
    <TouchableOpacity onPress={onStep} onPressIn={handlePressIn} onPressOut={handlePressOut} style={st.arrow}>
      {children}
    </TouchableOpacity>
  );
}

export default function TimePicker({ hour, minute, onChange, st }) {
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');

  function startEdit(field) {
    setEditing(field);
    setEditVal(field === 'hour' ? hour.toString() : minute.toString().padStart(2, '0'));
  }

  function finishEdit() {
    const val = parseInt(editVal, 10);
    if (!isNaN(val)) {
      if (editing === 'hour') onChange(Math.max(0, Math.min(23, val)), minute);
      else onChange(hour, Math.max(0, Math.min(59, val)));
    }
    setEditing(null);
    Keyboard.dismiss();
  }

  return (
    <View style={st.pickerRow}>
      <View style={st.pickerCol}>
        <HoldArrow onStep={() => onChange((hour + 1) % 24, minute)} st={st}>
          <Text style={st.arrowText}>▲</Text>
        </HoldArrow>
        {editing === 'hour' ? (
          <TextInput
            style={st.pickerInput}
            value={editVal}
            onChangeText={setEditVal}
            keyboardType="number-pad"
            selectTextOnFocus
            autoFocus
            onBlur={finishEdit}
            onSubmitEditing={finishEdit}
            maxLength={2}
          />
        ) : (
          <TouchableOpacity onPress={() => startEdit('hour')}>
            <Text style={st.pickerValue}>{hour.toString().padStart(2, '0')}</Text>
          </TouchableOpacity>
        )}
        <HoldArrow onStep={() => onChange((hour - 1 + 24) % 24, minute)} st={st}>
          <Text style={st.arrowText}>▼</Text>
        </HoldArrow>
      </View>
      <Text style={st.pickerSep}>:</Text>
      <View style={st.pickerCol}>
        <HoldArrow onStep={() => onChange(hour, (minute + 1) % 60)} st={st}>
          <Text style={st.arrowText}>▲</Text>
        </HoldArrow>
        {editing === 'minute' ? (
          <TextInput
            style={st.pickerInput}
            value={editVal}
            onChangeText={setEditVal}
            keyboardType="number-pad"
            selectTextOnFocus
            autoFocus
            onBlur={finishEdit}
            onSubmitEditing={finishEdit}
            maxLength={2}
          />
        ) : (
          <TouchableOpacity onPress={() => startEdit('minute')}>
            <Text style={st.pickerValue}>{minute.toString().padStart(2, '0')}</Text>
          </TouchableOpacity>
        )}
        <HoldArrow onStep={() => onChange(hour, (minute - 1 + 60) % 60)} st={st}>
          <Text style={st.arrowText}>▼</Text>
        </HoldArrow>
      </View>
    </View>
  );
}

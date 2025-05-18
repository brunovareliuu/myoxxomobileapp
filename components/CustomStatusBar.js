import React from 'react';
import { StatusBar, Platform, View } from 'react-native';
import { colors } from '../styles/globalStyles';

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight;

export default function CustomStatusBar({ backgroundColor = colors.primary, barStyle = "light-content" }) {
  return (
    <View style={{ height: STATUSBAR_HEIGHT, backgroundColor }}>
      <StatusBar
        translucent
        backgroundColor={backgroundColor}
        barStyle={barStyle}
      />
    </View>
  );
} 
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../styles/globalStyles';

export default function AlertScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Alertas</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: colors.white,
    fontSize: 24,
  },
}); 
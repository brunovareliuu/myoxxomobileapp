import React from 'react';
import { View, Text, SafeAreaView, StyleSheet, StatusBar } from 'react-native';
import { colors } from '../../styles/globalStyles';

export default function TaskManagerScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestor de Tareas</Text>
      </View>
      <View style={styles.content}>
        <Text>Gestor de tareas en construcción</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 
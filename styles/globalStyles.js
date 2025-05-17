import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#E31837',    // Rojo OXXO
  secondary: '#FFD700',  // Dorado
  white: '#FFFFFF',
  black: '#000000',
  gray: '#f5f5f5',
  darkGray: '#333333',
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  subtitle: {
    color: colors.secondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
    padding: 15,
    borderRadius: 8,
    marginVertical: 8,
  },
  primaryButtonText: {
    color: colors.white,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: colors.primary,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    color: colors.secondary,
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
}); 
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { useAppStyles } from '@/context/theme-context';

export function Copyright() {
  const styles = useAppStyles(createStyles);
  return <Text style={styles.text}>© 2026 Finiavana J Andrianirina</Text>;
}

const createStyles = () => StyleSheet.create({
  text: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: fonts.body,
    textAlign: 'center',
    opacity: 0.7,
    paddingVertical: 8,
  },
});
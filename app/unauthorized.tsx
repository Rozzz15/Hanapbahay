import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function Unauthorized() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unauthorized Access</Text>
      <Text style={styles.message}>
        Sorry, you don&apos;t have permission to access this content.
      </Text>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>Return to Home</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  link: {
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  linkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 
import { View, Text, StyleSheet } from 'react-native';

export default function SignUpScreen() {
    return (
        <View style={styles.container}>
            <Text>Signup Screen</Text>
            {/* Add signup form here */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

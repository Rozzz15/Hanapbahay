import React, { useState } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';

interface ChatItem {
    id: string;
    name: string;
    message: string;
    time: string;
    unreadCount?: number;
    avatar?: string;
    read?: boolean;
}

interface ChatSearchBarProps {
    data: ChatItem[];
    onSearch: (filteredData: ChatItem[]) => void;
}

const ChatSearchBar: React.FC<ChatSearchBarProps> = ({ data, onSearch }) => {
    const [query, setQuery] = useState('');

    const handleSearch = (text: string) => {
        setQuery(text);
        const filteredData = data.filter((item) =>
            item.name.toLowerCase().includes(text.toLowerCase()) ||
            item.message.toLowerCase().includes(text.toLowerCase())
        );
        onSearch(filteredData);
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchWrapper}>
                <Search style={styles.icon} size={20} />
                <TextInput
                    style={styles.input}
                    placeholder="Search messages"
                    value={query}
                    onChangeText={handleSearch}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 10,
        backgroundColor: '#fff',
        marginBottom: 20,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 25,
        paddingHorizontal: 10,
    },
    icon: {
        marginRight: 10,
        color: '#606060',
    },
    input: {
        flex: 1,
        height: 50,
        backgroundColor: 'transparent',
        fontSize: 18,
    },
});

export default ChatSearchBar; 
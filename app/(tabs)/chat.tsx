import ChatList, { ChatItem } from '@/components/ChatList';
import ChatSearchBar from '@/components/ChatSearchBar';
import { useState } from 'react';
import { View } from 'react-native';

const chatData: ChatItem[] = [
    {
        id: '1',
        name: 'Daniel Padilla',
        message: 'Kasama na po ba ang gamit',
        time: '15:23',
        unreadCount: 2,
        avatar: '',
        read: false,
    },
    {
        id: '2',
        name: 'Sarah Geronimo',
        message: 'Salamat po!',
        time: 'Yesterday',
        avatar: '',
        read: true,
    },
    {
        id: '3',
        name: 'Coco Martin',
        message: 'Ano po ang rules sa bisita?',
        time: '11/10/2021',
        avatar: '',
        read: true,
    },
    {
        id: '4',
        name: 'Marian Rivera',
        message: 'Magkano monthly rent?',
        time: '11/10/2021',
        avatar: '',
        read: true,
    },
    {
        id: '5',
        name: 'Dingdong Dantes',
        message: 'sige bro',
        time: '11/10/2021',
        avatar: '',
        read: true,
    },
];

const ChatPage = () => {
    const [filteredChats, setFilteredChats] = useState(chatData);

    const handleSearch = (filteredData: ChatItem[]) => {
        setFilteredChats(filteredData);
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 40 }}>
            <ChatSearchBar data={chatData} onSearch={handleSearch} />
            <ChatList chats={filteredChats} />
        </View>
    );
};

export default ChatPage;

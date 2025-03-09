import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Minus, Plus } from "lucide-react-native";

export type CountSelectProps = {
    label: string;
    onChange: (value: number) => void;
};

const CountSelect: React.FC<CountSelectProps> = ({ label, onChange }) => {
    const [count, setCount] = useState(0);
    const [isFocused, setIsFocused] = useState(false);

    const handleUpdate = (value: number) => {
        const newCount = Math.max(0, value);
        setCount(newCount);
        onChange?.(newCount);
    };

    const handleTextChange = (text: string) => {
        const value = parseInt(text, 10);
        if (!isNaN(value)) {
            handleUpdate(value);
        }
    };

    return (
        <HStack className="items-center justify-between">
            <Text className="text-gray-700 text-lg">{label}</Text>
            <HStack className="items-center space-x-4 gap-8">
                <TouchableOpacity
                    onPress={() => handleUpdate(count - 1)}
                    disabled={count === 0}
                >
                    <View className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center">
                        <Icon as={Minus} size="sm" color={count === 0 ? "#D1D5DB" : "#374151"} />
                    </View>
                </TouchableOpacity>
                <TextInput
                    className={`text-lg font-semibold text-center w-12 ${
                        isFocused ? "border border-gray-400 rounded-md" : ""
                    }`}
                    keyboardType="numeric"
                    value={String(count)}
                    onChangeText={handleTextChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
                <TouchableOpacity onPress={() => handleUpdate(count + 1)}>
                    <View className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center">
                        <Icon as={Plus} size="sm" color="#374151" />
                    </View>
                </TouchableOpacity>
            </HStack>
        </HStack>
    );
};

export default CountSelect;

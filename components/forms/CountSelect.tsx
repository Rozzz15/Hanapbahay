import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { HStack } from "@/components/ui/hstack";
import { Minus, Plus } from "lucide-react-native";

export type CountSelectProps = {
    label: string;
    value?: number;
    onChange: (value: number) => void;
    isPreSelected?: boolean;
};

const CountSelect: React.FC<CountSelectProps> = ({ label, value = 0, onChange, isPreSelected = false }) => {
    const [count, setCount] = useState(value);
    const [isFocused, setIsFocused] = useState(false);

    // Sync with parent value
    React.useEffect(() => {
        setCount(value);
    }, [value]);

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
        <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', flex: 1 }}>
                    {label}
                </Text>
                {isPreSelected && value > 0 && (
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#22C55E' }}>
                        ✓ Pre-filled
                    </Text>
                )}
            </View>
            <HStack space="md" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }} />
                <HStack space="xl" style={{ alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => handleUpdate(count - 1)}
                        disabled={count === 0}
                        style={{ opacity: count === 0 ? 0.5 : 1 }}
                    >
                        <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            borderWidth: 2,
                            borderColor: count === 0 ? '#d1d5db' : '#374151',
                            backgroundColor: '#ffffff',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                            elevation: 2,
                        }}>
                            <Minus size={16} color={count === 0 ? "#D1D5DB" : "#374151"} />
                        </View>
                    </TouchableOpacity>
                    <TextInput
                        style={{
                            fontSize: 20,
                            fontWeight: 'bold',
                            textAlign: 'center',
                            width: 60,
                            height: 40,
                            borderWidth: isPreSelected ? 3 : (isFocused ? 2 : 1),
                            borderColor: isPreSelected ? '#22C55E' : (isFocused ? '#3b82f6' : '#d1d5db'),
                            borderRadius: 8,
                            backgroundColor: isPreSelected ? '#f0fdf4' : '#ffffff',
                            color: '#111827',
                            boxShadow: isPreSelected ? '0 2px 4px rgba(34, 197, 94, 0.3)' : 'none',
                            elevation: isPreSelected ? 2 : 0,
                        }}
                        keyboardType="numeric"
                        value={String(count)}
                        onChangeText={handleTextChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                    />
                    <TouchableOpacity onPress={() => handleUpdate(count + 1)}>
                        <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            borderWidth: 2,
                            borderColor: '#374151',
                            backgroundColor: '#ffffff',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                            elevation: 2,
                        }}>
                            <Plus size={16} color="#374151" />
                        </View>
                    </TouchableOpacity>
                </HStack>
            </HStack>
        </View>
    );
};

export default CountSelect;

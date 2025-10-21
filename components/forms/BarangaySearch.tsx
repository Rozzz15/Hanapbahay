import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Icon } from "@/components/ui/icon";
import { MapPin, ChevronUp, ChevronDown } from "lucide-react-native";

export type BarangaySearchProps = {
    label: string;
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
};

// Specific barangays for the filter
const barangayOptions = [
    "Danlagan",
    "Gomez", 
    "Magsaysay",
    "Rizal",
    "Bocboc",
    "Talolong"
];

const BarangaySearch: React.FC<BarangaySearchProps> = ({ 
    label, 
    value = '', 
    onChange, 
    placeholder = "Select barangay..." 
}) => {
    const [showDropdown, setShowDropdown] = useState(false);

    const handleBarangaySelect = (barangay: string) => {
        onChange(barangay);
        setShowDropdown(false);
    };

    const handleClear = () => {
        onChange('');
        setShowDropdown(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            if (showDropdown) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            // Add a small delay to allow for selection
            const timer = setTimeout(() => {
                document.addEventListener('click', handleClickOutside);
            }, 100);
            
            return () => {
                clearTimeout(timer);
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, [showDropdown]);

    return (
        <View style={{ marginBottom: 0 }}>
            {label && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', flex: 1 }}>
                        {label}
                    </Text>
                    {value && (
                        <TouchableOpacity onPress={handleClear}>
                            <Text style={{ fontSize: 12, fontWeight: '500', color: '#ef4444' }}>
                                Clear
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
            
            <View style={{ position: 'relative' }}>
                <TouchableOpacity
                    onPress={() => setShowDropdown(!showDropdown)}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#d1d5db',
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        elevation: 1,
                    }}
                >
                    <Icon as={MapPin} size="sm" color="#6b7280" />
                    <Text style={{
                        flex: 1,
                        marginLeft: 12,
                        fontSize: 15,
                        color: value ? '#111827' : '#9ca3af',
                    }}>
                        {value || placeholder}
                    </Text>
                    <Icon 
                        as={showDropdown ? ChevronUp : ChevronDown} 
                        size="sm" 
                        color="#6b7280" 
                    />
                </TouchableOpacity>
                
                {showDropdown && (
                    <>
                        {/* Backdrop */}
                        <TouchableOpacity
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 999,
                            }}
                            onPress={() => setShowDropdown(false)}
                            activeOpacity={1}
                        />
                        
                        {/* Dropdown */}
                        <View style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: '#ffffff',
                            borderWidth: 1,
                            borderColor: '#d1d5db',
                            borderBottomWidth: 0,
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                            maxHeight: 200,
                            zIndex: 1000,
                            boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.1)',
                            elevation: 4,
                        }}>
                            <ScrollView style={{ maxHeight: 200 }}>
                                {barangayOptions.map((barangay, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => handleBarangaySelect(barangay)}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 14,
                                            borderBottomWidth: index < barangayOptions.length - 1 ? 1 : 0,
                                            borderBottomColor: '#f3f4f6',
                                            backgroundColor: value === barangay ? '#f0f9ff' : 'transparent',
                                        }}
                                    >
                                        <Text style={{ 
                                            fontSize: 15, 
                                            color: value === barangay ? '#1e40af' : '#111827',
                                            fontWeight: value === barangay ? '600' : '400',
                                        }}>
                                            {barangay}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </>
                )}
            </View>
        </View>
    );
};

export default BarangaySearch;

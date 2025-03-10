import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import colors from "tailwindcss/colors";

type ButtonProps = {
    isLoading?: boolean;
    text: string;
    onPress: () => void;
};

export function OutlineButton({ isLoading = false, text, onPress }: ButtonProps) {
    return (
        <Button 
            onPress={onPress} 
            disabled={isLoading} 
            variant="outline"
            action="primary"
            size="xl"
            className="rounded-full bg-transparent active:opacity-100 disabled:opacity-70"
        >
            {isLoading && <ButtonSpinner color={colors.gray[400]} />}
            <ButtonText className="text-black font-medium text-lg ml-2">
                {isLoading ? "Please wait..." : text}
            </ButtonText>
        </Button>
    );
}

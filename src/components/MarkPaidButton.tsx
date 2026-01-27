
"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkPaidButtonProps {
    rowId: string;
    concept: string;
}

export function MarkPaidButton({ rowId, concept }: MarkPaidButtonProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleMarkPaid = async () => {
        if (loading || success) return;

        setLoading(true);
        try {
            const res = await fetch("/api/finance/mark-paid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rowId })
            });

            if (res.ok) {
                setSuccess(true);
                // Refresh the page to update the list
                window.location.reload();
            } else {
                alert("Error al marcar como pagado");
            }
        } catch (error) {
            console.error("Error marking as paid:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleMarkPaid}
            disabled={loading || success}
            className={cn(
                "p-2 rounded-lg border transition-all duration-200",
                success
                    ? "bg-green-500/20 border-green-500/50 text-green-500"
                    : "bg-white/5 border-white/10 hover:bg-primary/20 hover:border-primary/50 text-muted-foreground hover:text-primary",
                loading && "opacity-50 animate-pulse"
            )}
            title={`Marcar ${concept} como pagado`}
        >
            <Check className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
    );
}

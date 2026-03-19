import { useEffect } from 'react';

export default function Toast({ message, type, onDone }) {
    useEffect(() => {
        const timer = setTimeout(onDone, 3000);
        return () => clearTimeout(timer);
    }, [onDone]);

    return (
        <div className={`toast ${type}`}>
            {message}
        </div>
    );
}

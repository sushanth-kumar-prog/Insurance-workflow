import React from 'react';
import { Clock, AlertTriangle, CheckCircle, PauseCircle } from 'lucide-react';

const SlaBadge = ({ status = 'ON_TIME', remainingMinutes, isPaused = false }) => {
    if (isPaused) {
        return (
            <span className="badge badge-warning">
                <PauseCircle className="w-3.5 h-3.5" />
                SLA Paused (Query Loop)
            </span>
        );
    }

    switch (status) {
        case 'BREACHED':
            return (
                <span className="badge badge-danger animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    SLA Breached ({remainingMinutes != null ? `${Math.abs(remainingMinutes)}m overdue` : 'Breached'})
                </span>
            );
        case 'WARNING':
            return (
                <span className="badge badge-warning">
                    <Clock className="w-3.5 h-3.5" />
                    SLA Warning ({remainingMinutes}m remaining)
                </span>
            );
        case 'ON_TIME':
        default:
            return (
                <span className="badge badge-success">
                    <CheckCircle className="w-3.5 h-3.5" />
                    SLA On Time ({remainingMinutes != null ? `${remainingMinutes}m remaining` : 'Within Mandate'})
                </span>
            );
    }
};

export default SlaBadge;

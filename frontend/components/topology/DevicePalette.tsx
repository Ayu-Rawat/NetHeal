'use client';

import { Router, Monitor, Printer, Server, Wifi, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

const devices = [
  {
    id: 'router',
    label: 'Router',
    description: 'Layer-3 packet forwarder',
    icon: <Router className="w-5 h-5" />,
    color: 'text-cyan-400',
    activeClass: 'bg-navy-700 border-cyan-500/60 text-cyan-400',
  },
  {
    id: 'pc',
    label: 'PC',
    description: 'End-host workstation',
    icon: <Monitor className="w-5 h-5" />,
    color: 'text-emerald-400',
    activeClass: 'bg-navy-700 border-emerald-500/60 text-emerald-400',
  },
  {
    id: 'printer',
    label: 'Printer',
    description: 'Network printer',
    icon: <Printer className="w-5 h-5" />,
    color: 'text-amber-400',
    activeClass: 'bg-navy-700 border-amber-500/60 text-amber-400',
  },
  {
    id: 'server',
    label: 'Server',
    description: 'App/data server',
    icon: <Server className="w-5 h-5" />,
    color: 'text-purple-400',
    activeClass: 'bg-navy-700 border-purple-500/60 text-purple-400',
  },
  {
    id: 'switch',
    label: 'Switch',
    description: 'Layer-2 switch',
    icon: <Wifi className="w-5 h-5" />,
    color: 'text-blue-400',
    activeClass: 'bg-navy-700 border-blue-500/60 text-blue-400',
  },
  {
    id: 'storage',
    label: 'Storage',
    description: 'NAS/SAN device',
    icon: <HardDrive className="w-5 h-5" />,
    color: 'text-rose-400',
    activeClass: 'bg-navy-700 border-rose-500/60 text-rose-400',
  },
];

interface DevicePaletteProps {
  selectedDevice: string | null;
  onSelectDevice: (id: string | null) => void;
}

export function DevicePalette({ selectedDevice, onSelectDevice }: DevicePaletteProps) {
  const handleDragStart = (e: React.DragEvent, deviceId: string) => {
    // Set data so NetworkCanvas can read it on drop
    e.dataTransfer.setData('application/x-device-type', deviceId);
    e.dataTransfer.setData('text/plain', deviceId);
    e.dataTransfer.effectAllowed = 'copy';
    onSelectDevice(deviceId);
  };

  return (
    <aside className="w-[68px] bg-[#181818] border-r border-[#333] flex flex-col shrink-0">
      {/* Header */}
      <div className="px-1 py-2 border-b border-[#333] text-center">
        <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
          Devices
        </span>
      </div>

      {/* Device buttons — draggable */}
      <div className="flex-1 flex flex-col gap-1 p-1.5 py-2 overflow-y-auto">
        {devices.map((device) => {
          const isSelected = selectedDevice === device.id;
          return (
            <button
              key={device.id}
              draggable
              title={`${device.label} — ${device.description}\nDrag onto canvas or click to select`}
              onDragStart={(e) => handleDragStart(e, device.id)}
              onClick={() => onSelectDevice(isSelected ? null : device.id)}
              className={cn(
                'flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg border transition-all text-center w-full cursor-grab active:cursor-grabbing',
                isSelected
                  ? device.activeClass
                  : 'bg-[#101010] border-transparent text-slate-500 hover:bg-[#252526] hover:text-slate-300 hover:border-[#444]'
              )}
            >
              <span className={cn('transition-colors', isSelected ? device.color : 'text-slate-400')}>
                {device.icon}
              </span>
              <span className={cn('text-[9px] font-semibold leading-none', isSelected ? device.color : 'text-slate-500')}>
                {device.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-1 py-2 border-t border-[#333] text-center">
        <span className="text-[8px] text-slate-600 leading-tight block">
          Drag to canvas
        </span>
      </div>
    </aside>
  );
}

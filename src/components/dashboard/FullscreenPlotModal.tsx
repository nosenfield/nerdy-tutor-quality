"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import { ScatterPlot, type ScatterPlotProps } from "@/components/dashboard/ScatterPlot";
import { useDashboardStore } from "@/lib/stores/dashboardStore";

/**
 * Fullscreen Plot Modal Props
 */
interface FullscreenPlotModalProps {
  plotType: "attendance" | "reschedules" | "quality";
  plotProps: Omit<ScatterPlotProps, "plotType">;
}

/**
 * Fullscreen Plot Modal Component
 * 
 * Displays a scatter plot in fullscreen modal view.
 * Maintains all interactive features (zoom/pan, dot click, threshold zones).
 */
export function FullscreenPlotModal({
  plotType,
  plotProps,
}: FullscreenPlotModalProps) {
  const { fullscreenPlot, setFullscreenPlot } = useDashboardStore();
  const isOpen = fullscreenPlot === plotType;

  const handleClose = () => {
    setFullscreenPlot(null);
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={handleClose}
        aria-labelledby="fullscreen-plot-title"
        aria-describedby="fullscreen-plot-description"
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-7xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <Dialog.Title
                    id="fullscreen-plot-title"
                    className="text-xl font-semibold text-gray-900"
                  >
                    {plotProps.title}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    aria-label="Close modal"
                  >
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                {/* Plot content */}
                <div className="px-6 py-6">
                  <div className="h-[calc(100vh-200px)] min-h-[600px] w-full">
                    <ScatterPlot
                      {...plotProps}
                      plotType={plotType}
                    />
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}


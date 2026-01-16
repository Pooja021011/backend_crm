import * as React from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Trash2, X } from "lucide-react";

import { API_BASE } from "@/config/api";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";

export type LeadFileGalleryFile = {
  id: string;
  originalName?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  category?: string;
};

type LeadFileGalleryProps = {
  files: LeadFileGalleryFile[];
  className?: string;
  onDeleteFile?: (file: LeadFileGalleryFile) => void | Promise<void>;
};

function getFilePreviewUrl(fileId: string) {
  const accessToken = localStorage.getItem("accessToken");
  return `${API_BASE}/files/${fileId}/preview?token=${accessToken}`;
}

function getFileDownloadUrl(fileId: string) {
  const accessToken = localStorage.getItem("accessToken");
  return `${API_BASE}/files/${fileId}/download?token=${accessToken}`;
}

export function LeadFileGallery({
  files,
  className,
  onDeleteFile,
}: LeadFileGalleryProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeFile = files[activeIndex];

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < files.length - 1;

  const goPrev = React.useCallback(() => {
    setActiveIndex((idx) => Math.max(0, idx - 1));
  }, []);

  const goNext = React.useCallback(() => {
    setActiveIndex((idx) => Math.min(files.length - 1, idx + 1));
  }, [files.length]);

  React.useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, goPrev, goNext]);

  React.useEffect(() => {
    if (!isOpen) return;
    if (files.length === 0) {
      setIsOpen(false);
      return;
    }
    if (activeIndex > files.length - 1) {
      setActiveIndex(files.length - 1);
    }
  }, [isOpen, files.length, activeIndex]);

  if (files.length === 0) {
    return (
      <div className={className}>
        <div className="min-h-[72px] flex items-center justify-center bg-slate-50 rounded text-xs text-slate-500">
          No files yet. Click &quot;Upload&quot; to add files.
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="relative px-8"
      >
        <CarouselContent>
          {files.map((file, idx) => {
            const isImage = file.mimeType?.startsWith('image/');
            const previewUrl = getFilePreviewUrl(file.id);
            const downloadUrl = getFileDownloadUrl(file.id);
            
            return (
              <CarouselItem
                key={file.id}
                className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
              >
                <div className="relative border border-slate-200 rounded-lg bg-white hover:shadow-md transition-shadow group">
                  {/* Thumbnail */}
                  {isImage ? (
                    <div className="relative w-full h-24 bg-slate-100 rounded-t-lg overflow-hidden">
                      <img
                        src={previewUrl}
                        alt={file.originalName || "File"}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => {
                          setActiveIndex(idx);
                          setIsOpen(true);
                        }}
                        onError={(e) => {
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML =
                              '<div class="flex items-center justify-center h-full text-slate-400"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-full h-24 bg-slate-100 rounded-t-lg flex items-center justify-center cursor-pointer"
                      onClick={() => {
                        setActiveIndex(idx);
                        setIsOpen(true);
                      }}
                    >
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                  )}

                  {/* Action Buttons Overlay */}
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(downloadUrl, '_blank');
                      }}
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                    </Button>
                    {onDeleteFile && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onDeleteFile(file);
                        }}
                        title="Delete file"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </Button>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="p-1.5">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className="text-[10px] text-slate-700 font-medium truncate block flex-1"
                        title={file.originalName || file.filename}
                      >
                        {file.originalName || file.filename || "File"}
                      </span>
                      {file.category && (
                        <span className="text-[8px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded flex-shrink-0 uppercase">
                          {file.category}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-500">
                      {((file.size || 0) / 1024).toFixed(0)}KB
                    </span>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {/* Navigation Arrows */}
        <CarouselPrevious
          variant="ghost"
          className="left-1 top-1/2 -translate-y-1/2 bg-white/90 shadow-sm hover:bg-white"
        />
        <CarouselNext
          variant="ghost"
          className="right-1 top-1/2 -translate-y-1/2 bg-white/90 shadow-sm hover:bg-white"
        />
      </Carousel>

      {/* Preview Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden [&>button.absolute]:hidden">
          <div className="relative bg-black">
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 z-10 text-white hover:text-white bg-black/40 hover:bg-black/60"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>

            {activeFile && (
              <>
                {activeFile.mimeType?.startsWith('image/') ? (
                  <img
                    src={getFilePreviewUrl(activeFile.id)}
                    alt={activeFile.originalName || "File"}
                    className="w-full max-h-[80vh] object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[60vh] text-white">
                    <FileText className="w-24 h-24 mb-4" />
                    <p className="text-lg mb-2">{activeFile.originalName || activeFile.filename}</p>
                    <p className="text-sm text-gray-400 mb-4">
                      {((activeFile.size || 0) / 1024).toFixed(0)}KB
                    </p>
                    <Button
                      onClick={() => window.open(getFilePreviewUrl(activeFile.id), '_blank')}
                      className="bg-white text-black hover:bg-gray-200"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Open Preview
                    </Button>
                  </div>
                )}
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 disabled:opacity-40"
              onClick={goPrev}
              disabled={!canGoPrev}
              aria-label="Previous file"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 disabled:opacity-40"
              onClick={goNext}
              disabled={!canGoNext}
              aria-label="Next file"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
            <div className="text-sm text-muted-foreground truncate flex-1">
              {activeFile?.originalName || activeFile?.filename || "File"}
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(getFileDownloadUrl(activeFile.id), '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <div className="text-xs text-muted-foreground">
                {files.length > 0 ? `${activeIndex + 1} / ${files.length}` : ""}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


import * as React from "react";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";

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

export type LeadPhotoGalleryPhoto = {
  id: string;
  originalName?: string;
};

type LeadPhotoGalleryProps = {
  photos: LeadPhotoGalleryPhoto[];
  className?: string;
  onDeletePhoto?: (photo: LeadPhotoGalleryPhoto) => void | Promise<void>;
};

function getPhotoPreviewUrl(photoId: string) {
  const accessToken = localStorage.getItem("accessToken");
  return `${API_BASE}/files/${photoId}/preview?token=${accessToken}`;
}

export function LeadPhotoGallery({
  photos,
  className,
  onDeletePhoto,
}: LeadPhotoGalleryProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activePhoto = photos[activeIndex];

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < photos.length - 1;

  const goPrev = React.useCallback(() => {
    setActiveIndex((idx) => Math.max(0, idx - 1));
  }, []);

  const goNext = React.useCallback(() => {
    setActiveIndex((idx) => Math.min(photos.length - 1, idx + 1));
  }, [photos.length]);

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
    if (photos.length === 0) {
      setIsOpen(false);
      return;
    }
    if (activeIndex > photos.length - 1) {
      setActiveIndex(photos.length - 1);
    }
  }, [isOpen, photos.length, activeIndex]);

  if (photos.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-4 bg-slate-50 rounded text-xs text-slate-500">
          No photos yet. Click &quot;Add&quot; to upload photos.
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
          {photos.map((photo, idx) => {
            const previewUrl = getPhotoPreviewUrl(photo.id);
            return (
              <CarouselItem
                key={photo.id}
                className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
              >
                <div className="relative border border-slate-200 rounded-lg bg-white hover:shadow-md transition-shadow group">
                  <div className="relative w-full h-24 bg-slate-100 rounded-t-lg overflow-hidden">
                    <img
                      src={previewUrl}
                      alt={photo.originalName || "Photo"}
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

                    {onDeletePhoto && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onDeletePhoto(photo);
                        }}
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </Button>
                    )}
                  </div>

                  <div className="p-1.5">
                    <span
                      className="text-[10px] text-slate-500 truncate block"
                      title={photo.originalName}
                    >
                      {photo.originalName || "Photo"}
                    </span>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {/* Keep arrows inside the Photos box */}
        <CarouselPrevious
          variant="ghost"
          className="left-1 top-1/2 -translate-y-1/2 bg-white/90 shadow-sm hover:bg-white"
        />
        <CarouselNext
          variant="ghost"
          className="right-1 top-1/2 -translate-y-1/2 bg-white/90 shadow-sm hover:bg-white"
        />
      </Carousel>

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

            {activePhoto && (
              <img
                src={getPhotoPreviewUrl(activePhoto.id)}
                alt={activePhoto.originalName || "Photo"}
                className="w-full max-h-[80vh] object-contain"
              />
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 disabled:opacity-40"
              onClick={goPrev}
              disabled={!canGoPrev}
              aria-label="Previous photo"
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
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
            <div className="text-sm text-muted-foreground truncate">
              {activePhoto?.originalName || "Photo"}
            </div>
            <div className="text-xs text-muted-foreground">
              {photos.length > 0 ? `${activeIndex + 1} / ${photos.length}` : ""}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



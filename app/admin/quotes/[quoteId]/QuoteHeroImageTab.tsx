"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { Upload, Trash2 } from "lucide-react";
import saUploadQuoteHeroImage from "@/actions/saUploadQuoteHeroImage";
import Image from "next/image";

export default function QuoteHeroImageTab({
  quoteId,
  heroImageFileExtension,
}: {
  quoteId: string;
  heroImageFileExtension: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cacheBuster, setCacheBuster] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const existingHeroImageUrl = heroImageFileExtension
    ? `https://${
        process.env.NEXT_PUBLIC_WASABI_ENDPOINT
      }/voxd/quoteImages/${quoteId}.${heroImageFileExtension}${
        cacheBuster ? `?t=${cacheBuster}` : ""
      }`
    : null;

  // OG image is always generated (uses fallback chain: hero+logo, hero, org logo, partner logo)
  const ogImageUrl = `https://${
    process.env.NEXT_PUBLIC_WASABI_ENDPOINT
  }/voxd/quoteOgWithLogo/${quoteId}.webp${
    cacheBuster ? `?t=${cacheBuster}` : ""
  }`;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/svg+xml",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Invalid file type. Please upload a PNG, JPG, GIF, SVG, or WebP image.",
      );
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 5MB.");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        const extension = file.name.split(".").pop() || "png";

        const result = await saUploadQuoteHeroImage({
          quoteId,
          fileBase64: base64,
          fileExtension: extension,
        });

        if (result.success) {
          toast.success("Hero image uploaded successfully");
          setPreview(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          setCacheBuster(Date.now());
          router.refresh();
        } else {
          toast.error(result.error || "Failed to upload hero image");
        }

        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload hero image");
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Quote Hero Image</h2>
        <p className="text-sm text-muted-foreground">
          Upload a hero image for this quote. The hero image will be displayed
          as the banner on the proposal and concept pages.
        </p>
      </div>

      <div className="flex gap-2 items-center">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {existingHeroImageUrl ? "Replace Hero Image" : "Upload Hero Image"}
        </Button>
        <Input
          id="heroImage"
          type="file"
          accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </div>

      {/* Current Hero Image */}
      {existingHeroImageUrl && !preview && (
        <div className="space-y-2">
          <Label>Current Hero Image</Label>
          <div className="border rounded-lg p-4 bg-muted/30">
            <Image
              src={existingHeroImageUrl}
              alt="Current hero image"
              width={800}
              height={300}
              className="object-cover w-full rounded"
              unoptimized
            />
          </div>
        </div>
      )}

      {/* OG Image Preview */}
      {!preview && (
        <div className="space-y-2">
          <Label>OG Image Preview (with logo overlay)</Label>
          <p className="text-xs text-muted-foreground">
            This image is used for social media previews when sharing
            concept/proposal links.
          </p>
          <div className="border rounded-lg p-4 bg-muted/30">
            <Image
              src={ogImageUrl}
              alt="OG image with logo"
              width={1200}
              height={630}
              className="object-cover w-full rounded"
              unoptimized
            />
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>New Hero Image Preview</Label>
            <div className="border rounded-lg p-4 bg-muted/30 relative">
              <Image
                src={preview}
                alt="Hero image preview"
                width={800}
                height={300}
                className="object-cover w-full rounded"
                unoptimized
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-6 right-6"
                onClick={clearSelection}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Hero Image
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={clearSelection}
              disabled={uploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

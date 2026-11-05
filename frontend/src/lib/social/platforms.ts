export type PlatformId =
  "youtube" | "instagram" | "facebook" | "tiktok" | "pinterest";

export type Platform = {
  id: PlatformId;
  label: string;
  detail: string;
};

export const platforms: Platform[] = [
  { id: "youtube", label: "YouTube", detail: "Vidéo ou Short" },
  { id: "instagram", label: "Instagram", detail: "Reel professionnel" },
  { id: "facebook", label: "Facebook", detail: "Vidéo ou Reel de page" },
  {
    id: "tiktok",
    label: "TikTok",
    detail: "Publication soumise à éligibilité",
  },
  { id: "pinterest", label: "Pinterest", detail: "Épingle vidéo" },
];

export function selectedPlatforms(ids: PlatformId[]): Platform[] {
  return platforms.filter((platform) => ids.includes(platform.id));
}

export function validVideo(file: Pick<File, "type" | "size">): boolean {
  return file.type.startsWith("video/") && file.size > 0;
}

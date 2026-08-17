import type { ComponentType, SVGProps } from "react";
import {
  IconBed,
  IconBottle,
  IconBox,
  IconCar,
  IconClip,
  IconCup,
  IconLaptop,
  IconPan,
  IconPaw,
  IconPlug,
  IconShirt,
  IconSofa,
  IconSpark,
} from "@/components/icons";

type IconCmp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const CATEGORY_ICONS: Record<string, IconCmp> = {
  电子产品: IconLaptop,
  家具: IconSofa,
  电器: IconPlug,
  家电: IconPlug,
  衣物: IconShirt,
  箱包: IconBox,
  日用品: IconBottle,
  饰品: IconSpark,
  床品: IconBed,
  消耗品: IconBottle,
  交通工具: IconCar,
  厨具: IconPan,
  洗护用品: IconBottle,
  食品: IconCup,
  "食品/饮品": IconCup,
  宠物用品: IconPaw,
  办公用品: IconClip,
  能力: IconSpark,
};

export function CategoryIcon({
  category,
  size = 20,
}: {
  category: string;
  size?: number;
}) {
  const Icon = CATEGORY_ICONS[category] ?? IconBox;
  return <Icon size={size} />;
}

export function categoryTagClass(kind: "durable" | "consumable" | "skill" | string): string {
  if (kind === "consumable") return "tag-neutral";
  if (kind === "skill") return "tag-brand";
  return "tag-brand-soft";
}

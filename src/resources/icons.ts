import type { IconType } from "react-icons";

import {
  HiArrowRight,
  HiArrowTopRightOnSquare,
  HiArrowUpRight,
  HiEnvelope,
  HiOutlineDocument,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineGlobeAsiaAustralia,
  HiOutlineLink,
  HiOutlineMap,
  HiOutlineRocketLaunch,
} from "react-icons/hi2";

import {
  PiBookBookmarkDuotone,
  PiGridFourDuotone,
  PiHouseDuotone,
  PiImageDuotone,
  PiUserCircleDuotone,
} from "react-icons/pi";

import {
  SiFigma,
  SiJavascript,
  SiNextdotjs,
  SiNodedotjs,
  SiOpenvpn,
  SiSeafile,
  SiSupabase,
  SiUbuntu,
  SiWireguard,
} from "react-icons/si";

import { GrOracle } from "react-icons/gr";
import { TbTxt } from "react-icons/tb";

import {
  FaDiscord,
  FaFacebook,
  FaGithub,
  FaInstagram,
  FaLinkedin,
  FaPinterest,
  FaReddit,
  FaRegNoteSticky,
  FaTelegram,
  FaThreads,
  FaWhatsapp,
  FaX,
  FaXTwitter,
} from "react-icons/fa6";

export const iconLibrary: Record<string, IconType> = {
  arrowUpRight: HiArrowUpRight,
  arrowRight: HiArrowRight,
  email: HiEnvelope,
  globe: HiOutlineGlobeAsiaAustralia,
  map: HiOutlineMap,
  person: PiUserCircleDuotone,
  grid: PiGridFourDuotone,
  book: PiBookBookmarkDuotone,
  openLink: HiOutlineLink,
  home: PiHouseDuotone,
  gallery: PiImageDuotone,
  discord: FaDiscord,
  eye: HiOutlineEye,
  eyeOff: HiOutlineEyeSlash,
  github: FaGithub,
  linkedin: FaLinkedin,
  x: FaX,
  twitter: FaXTwitter,
  threads: FaThreads,
  arrowUpRightFromSquare: HiArrowTopRightOnSquare,
  document: HiOutlineDocument,
  text: TbTxt,
  rocket: HiOutlineRocketLaunch,
  javascript: SiJavascript,
  nodejs: SiNodedotjs,
  nextjs: SiNextdotjs,
  supabase: SiSupabase,
  figma: SiFigma,
  facebook: FaFacebook,
  pinterest: FaPinterest,
  whatsapp: FaWhatsapp,
  reddit: FaReddit,
  telegram: FaTelegram,
  instagram: FaInstagram,
  stickyNote: FaRegNoteSticky,

  // Custom Tech Icons
  oracle: GrOracle,
  ubuntu: SiUbuntu,
  openvpn: SiOpenvpn,
  wireguard: SiWireguard,
  seafile: SiSeafile,
};

export type IconLibrary = typeof iconLibrary;
export type IconName = keyof IconLibrary;

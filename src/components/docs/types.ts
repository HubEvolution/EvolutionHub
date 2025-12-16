export interface DocsStep {
  title: string;
  description: string;
  checklist: string[];
  link: string;
  linkLabel: string;
}

export interface DocsResource {
  title: string;
  description: string;
  link: string;
  icon: string;
}

export interface DirectAccessItem {
  label: string;
  href: string;
}

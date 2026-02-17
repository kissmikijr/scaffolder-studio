import yaml from 'js-yaml';
import { TemplateEntityV1beta3 } from '@backstage/plugin-scaffolder-common';

export const sortBy = (by: string) => (a: any, b: any) => {
  if (by === 'updated') {
    if (b?.updated) {
      return new Date(b.updated).getTime() - new Date(a.updated).getTime();
    } else if (b?.published_at) {
      return (
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );
    }
  } else if (by === 'name') {
    if (a?.metadata) {
      return a.metadata.name.localeCompare(b.metadata.name);
    } else if (a?.scaffolder_template) {
      const templateA = yaml.load(
        a?.scaffolder_template,
      ) as TemplateEntityV1beta3;
      const templateB = yaml.load(
        b?.scaffolder_template,
      ) as TemplateEntityV1beta3;

      return templateA.metadata.name.localeCompare(templateB.metadata.name);
    }
  }
  return 0;
};

import { PermissionWithDescription } from './permission/entities/permission-with-description.model';

export const PERMISSION_DESCRIPTIONS: PermissionWithDescription[] = [
  { name: 'ADD_ROLE', type: 'Role', description: 'Create new roles.' },
  { name: 'EDIT_ROLE', type: 'Role', description: 'Edit roles.' },
  { name: 'DELETE_ROLE', type: 'Role', description: 'Delete roles.' },
  { name: 'VIEW_ROLES', type: 'Role', description: 'View all roles.' },
  {
    name: 'VIEW_PERMISSION',
    type: 'Permission',
    description: 'View all permissions.',
  },
  {
    name: 'ASSIGN_PERMISSION',
    type: 'Permission',
    description: 'Assign permissions to a role.',
  },
  {
    name: 'ADD_USER_WITH_ROLE',
    type: 'User',
    description: 'Add new users with role.',
  },
  { name: 'EDIT_USER_ROLE', type: 'User', description: 'Change user roles.' },
  {
    name: 'EDIT_USER_LOCATION',
    type: 'User',
    description: 'Change user location.',
  },
  { name: 'VIEW_USERS', type: 'User', description: 'View all users.' },
  { name: 'ADD_ENTITY', type: 'Entity', description: 'Create entities.' },
  { name: 'EDIT_ENTITY', type: 'Entity', description: 'Edit entities.' },
  { name: 'DELETE_ENTITY', type: 'Entity', description: 'Delete entities' },
  {
    name: 'ASSIGN_TO_ENTITY',
    type: 'Entity',
    description: 'Assign users to entities.',
  },
  {
    name: 'VIEW_ALL_ENTITY',
    type: 'Entity',
    description: 'View all entities.',
  },
  {
    name: 'VIEW_ALL_MACHINERY',
    type: 'Entity',
    description: 'View all machinery.',
  },
  {
    name: 'VIEW_ALL_VEHICLES',
    type: 'Entity',
    description: 'View all vehicles.',
  },
  {
    name: 'VIEW_ALL_VESSELS',
    type: 'Entity',
    description: 'View all vessels.',
  },
  {
    name: 'VIEW_ALL_DIVISION_ENTITY',
    type: 'Entity',
    description: `View all entities of the user's division.`,
  },
  {
    name: 'MODIFY_PERIODIC_MAINTENANCE',
    type: 'Entity',
    description: 'Create, edit and delete periodic maintenance of entities.',
  },
  {
    name: 'MODIFY_REPAIR_REQUEST',
    type: 'Entity',
    description: 'Create, edit and delete repair requests of entities',
  },
  {
    name: 'MODIFY_SPARE_PR',
    type: 'Entity',
    description: 'Create, edit and delete spare PRs of entities',
  },
  {
    name: 'MODIFY_BREAKDOWN',
    type: 'Entity',
    description: 'Create, edit and delete breakdowns of entities',
  },
  {
    name: 'ENTITY_ADMIN',
    type: 'Assignment',
    description: 'Can be assigned to entity as admins.',
  },
  {
    name: 'ENTITY_ENGINEER',
    type: 'Assignment',
    description: 'Can be assigned to entity as engineers.',
  },
  {
    name: 'ENTITY_USER',
    type: 'Assignment',
    description: 'Can be assigned to entity as users.',
  },
  {
    name: 'ENTITY_TECHNICIAN',
    type: 'Assignment',
    description: 'Can be assigned to entity as technicians.',
  },
  // {
  //   name: 'MODIFY_CHECKLIST_TEMPLATE',
  //   type: 'Config',
  //   description: 'Create, edit and delete checklist templates.',
  // },
  {
    name: 'MODIFY_TYPES',
    type: 'Config',
    description: 'Create, edit and delete types.',
  },
  {
    name: 'MODIFY_HULL_TYPES',
    type: 'Config',
    description: 'Create, edit and delete hull types.',
  },
  {
    name: 'MODIFY_BRANDS',
    type: 'Config',
    description: 'Create, edit and delete brands.',
  },
  {
    name: 'MODIFY_ENGINES',
    type: 'Config',
    description: 'Create, edit and delete engines.',
  },
  {
    name: 'MODIFY_INTER_SERVICE_COLOR',
    type: 'Config',
    description: 'Create, edit and delete inter service color.',
  },
  {
    name: 'MODIFY_LOCATIONS',
    type: 'Config',
    description: 'Create, edit and delete locations and zones.',
  },
  {
    name: 'MODIFY_DIVISIONS',
    type: 'Config',
    description: 'Create, edit and delete divisions.',
  },
  {
    name: 'MODIFY_USER_ASSIGNMENTS',
    type: 'Config',
    description: 'Create, edit and delete user assignments.',
  },
  {
    name: 'VIEW_TEMPLATES',
    type: 'Config',
    description: 'View all templates.',
  },
  {
    name: 'MODIFY_TEMPLATES',
    type: 'Config',
    description: 'Create, edit and delete templates.',
  },
  { name: 'VIEW_DASHBOARD', type: 'Misc', description: 'View dashboard.' },
  {
    name: 'MODIFY_DEVELOPER_PERMISSIONS',
    type: 'Developer',
    description: 'View and edit developer permissions under role permissions.',
  },
  {
    name: 'VIEW_KEYS',
    type: 'Developer',
    description: 'View API keys for this app.',
  },
  {
    name: 'MODIFY_KEYS',
    type: 'Developer',
    description: 'Create, edit and delete API keys for this app.',
  },
];

export const PERMISSIONS = PERMISSION_DESCRIPTIONS.map((d) => d.name);

export const CHECKLIST_TYPES = ['Daily', 'Weekly'];

// In seconds the duration which browsers cache images
// 12,960,000 seconds in a month
export const ATTACHMENT_CACHE_DURATION = 12960000;

export const ENTITY_ASSIGNMENT_TYPES = [
  'User',
  'Technician',
  'Engineer',
  'Admin',
];

// 10 MB
export const MAX_FILE_SIZE = 10 * 1000000;
// 2 MB
export const COMPRESS_IF_GREATER = 2 * 1000000;

import { Reflector } from '@nestjs/core';
// These checks need only the actor and the workspace ID.
type WorkspaceRoutePermission =
  | 'workspace.read'
  | 'workspace.update'
  | 'workspace.member.list'
  | 'workspace.leave'
  | 'project.create';

export type RouteAccess =
  | { kind: 'authenticated' }
  | { kind: 'permission'; permission: 'workspace.create' }
  | {
      kind: 'workspace';
      permission: WorkspaceRoutePermission;
      param?: string;
    };

export const AccessMetadata = Reflector.createDecorator<RouteAccess>();

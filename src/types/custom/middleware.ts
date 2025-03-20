import { Request } from "express";

export type AcceptedTripSearchFilters = {
  id?: string;
  name?: string;
  description?: string;
  color?: string;
  public?: string;
  sort?: string;
  page?: string;
  point?: string;
  radius?: string;
  polygonToIntersectId?: string;
  query?: string;
  userId?: string;
};

export interface RequestWithLoggedUser<
  ReqBody = any,
  ParamsDictionary = any,
  ReqQuery = any
> extends Request<ParamsDictionary, {}, ReqBody, ReqQuery> {
  userId: string;
}

export interface RequestWithOptionalLoggedUser<
  ReqBody = any,
  ParamsDictionary = any,
  ReqQuery = any
> extends Request<ParamsDictionary, {}, ReqBody, ReqQuery> {
  userId?: string;
}

export interface RequestWithFilterSearchParams<
  ReqBody = any,
  ParamsDictionary = any,
  ReqQuery = {}
> extends Request<
    ParamsDictionary,
    {},
    ReqBody,
    ReqQuery & AcceptedTripSearchFilters
  > {}

export interface RequestWithFilterSearchParamsAndOptionalLoggedUser<
  ReqBody = any,
  ParamsDictionary = any,
  ReqQuery = {}
> extends Request<
    ParamsDictionary,
    {},
    ReqBody,
    ReqQuery & AcceptedTripSearchFilters
  > {
  userId?: string;
}

export interface RequestWithFilterSearchParamsAndLoggedUser<
  ReqBody = any,
  ParamsDictionary = any,
  ReqQuery = {}
> extends RequestWithLoggedUser<
    ParamsDictionary,
    ReqBody,
    ReqQuery & AcceptedTripSearchFilters
  > {}

/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getVoidLogger } from '@backstage/backend-common';
import { ObjectFetchParams } from '../types/types';
import { KubernetesFanOutHandler } from './KubernetesFanOutHandler';

const fetchObjectsForService = jest.fn();

const getClustersByServiceId = jest.fn();

const mockFetch = (mock: jest.Mock) => {
  mock.mockImplementation((params: ObjectFetchParams) =>
    Promise.resolve({
      errors: [],
      responses: [
        {
          type: 'pods',
          resources: [
            {
              metadata: {
                name: `my-pods-${params.serviceId}-${params.clusterDetails.name}`,
              },
            },
          ],
        },
        {
          type: 'configmaps',
          resources: [
            {
              metadata: {
                name: `my-configmaps-${params.serviceId}-${params.clusterDetails.name}`,
              },
            },
          ],
        },
        {
          type: 'services',
          resources: [
            {
              metadata: {
                name: `my-services-${params.serviceId}-${params.clusterDetails.name}`,
              },
            },
          ],
        },
      ],
    }),
  );
};

describe('handleGetKubernetesObjectsForService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('retrieve objects for one cluster', async () => {
    getClustersByServiceId.mockImplementation(() =>
      Promise.resolve([
        {
          name: 'test-cluster',
          authProvider: 'serviceAccount',
        },
      ]),
    );

    mockFetch(fetchObjectsForService);

    const sut = new KubernetesFanOutHandler(
      getVoidLogger(),
      {
        fetchObjectsForService,
      },
      {
        getClustersByServiceId,
      },
      [],
    );

    const result = await sut.getKubernetesObjectsByEntity({
      entity: {
        apiVersion: 'backstage.io/v1beta1',
        kind: 'Component',
        metadata: {
          name: 'test-component',
          annotations: {
            'backstage.io/kubernetes-labels-selector':
              'backstage.io/test-label=test-component',
          },
        },
        spec: {
          type: 'service',
          lifecycle: 'production',
          owner: 'joe',
        },
      },
    });

    expect(getClustersByServiceId.mock.calls.length).toBe(1);
    expect(fetchObjectsForService.mock.calls.length).toBe(1);
    expect(result).toStrictEqual({
      items: [
        {
          cluster: {
            name: 'test-cluster',
          },
          errors: [],
          resources: [
            {
              resources: [
                {
                  metadata: {
                    name: 'my-pods-test-component-test-cluster',
                  },
                },
              ],
              type: 'pods',
            },
            {
              resources: [
                {
                  metadata: {
                    name: 'my-configmaps-test-component-test-cluster',
                  },
                },
              ],
              type: 'configmaps',
            },
            {
              resources: [
                {
                  metadata: {
                    name: 'my-services-test-component-test-cluster',
                  },
                },
              ],
              type: 'services',
            },
          ],
        },
      ],
    });
  });

  it('retrieve objects for two clusters', async () => {
    getClustersByServiceId.mockImplementation(() =>
      Promise.resolve([
        {
          name: 'test-cluster',
          authProvider: 'serviceAccount',
        },
        {
          name: 'other-cluster',
          authProvider: 'google',
        },
      ]),
    );

    mockFetch(fetchObjectsForService);

    const sut = new KubernetesFanOutHandler(
      getVoidLogger(),
      {
        fetchObjectsForService,
      },
      {
        getClustersByServiceId,
      },
      [],
    );

    const result = await sut.getKubernetesObjectsByEntity({
      auth: {
        google: 'google_token_123',
      },
      entity: {
        apiVersion: 'backstage.io/v1beta1',
        kind: 'Component',
        metadata: {
          name: 'test-component',
          annotations: {
            'backstage.io/kubernetes-labels-selector':
              'backstage.io/test-label=test-component',
          },
        },
        spec: {
          type: 'service',
          lifecycle: 'production',
          owner: 'joe',
        },
      },
    });

    expect(getClustersByServiceId.mock.calls.length).toBe(1);
    expect(fetchObjectsForService.mock.calls.length).toBe(2);
    expect(result).toStrictEqual({
      items: [
        {
          cluster: {
            name: 'test-cluster',
          },
          errors: [],
          resources: [
            {
              resources: [
                {
                  metadata: {
                    name: 'my-pods-test-component-test-cluster',
                  },
                },
              ],
              type: 'pods',
            },
            {
              resources: [
                {
                  metadata: {
                    name: 'my-configmaps-test-component-test-cluster',
                  },
                },
              ],
              type: 'configmaps',
            },
            {
              resources: [
                {
                  metadata: {
                    name: 'my-services-test-component-test-cluster',
                  },
                },
              ],
              type: 'services',
            },
          ],
        },
        {
          cluster: {
            name: 'other-cluster',
          },
          errors: [],
          resources: [
            {
              resources: [
                {
                  metadata: {
                    name: 'my-pods-test-component-other-cluster',
                  },
                },
              ],
              type: 'pods',
            },
            {
              resources: [
                {
                  metadata: {
                    name: 'my-configmaps-test-component-other-cluster',
                  },
                },
              ],
              type: 'configmaps',
            },
            {
              resources: [
                {
                  metadata: {
                    name: 'my-services-test-component-other-cluster',
                  },
                },
              ],
              type: 'services',
            },
          ],
        },
      ],
    });
  });
});

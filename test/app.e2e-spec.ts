import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import * as pactum from 'pactum';
import { AuthDto } from '../src/auth/dto/auth.dto';
import { EditUserDto } from '../src/user/dto';
import { CreateBookmarkDto, EditBookmarkDto } from 'src/bookmark/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      })
    );

    await app.init();
    await app.listen(2000);

    prisma = app.get(PrismaService);
    await prisma.cleanDb();

    pactum.request.setBaseUrl('http://localhost:2000');
  });

  afterAll(() => {
    app.close();
  });

  describe('Auth', () => {

    const dto: AuthDto = {
      email: 'ngeposta@gmail.com',
      password: 'abcd1234'
    };

    describe('Signup', () => {
      it('should throw an exception if email is empty', () => {
        return pactum.spec()
          .post(
            '/auth/signup',
          )
          .withBody({
            email: '',
            password: dto.password,
          })
          .expectStatus(400);
      });

      it('should throw an exception if password is empty', () => {
        return pactum.spec()
          .post(
            '/auth/signup',
          )
          .withBody({
            email: dto.email,
            password: '',
          })
          .expectStatus(400);
      });

      it('should throw an exception if email and password are empty', () => {
        return pactum.spec()
          .post(
            '/auth/signup',
          )
          .withBody({
            email: '',
            password: '',
          })
          .expectStatus(400);
      });

      it('should throw an exception if body has no params provided', () => {
        return pactum.spec()
          .post(
            '/auth/signup',
          )
          .expectStatus(400);
      });

      it('should signup', () => {
        return pactum.spec()
          .post(
            '/auth/signup',
          )
          .withBody(dto)
          .expectStatus(201);
      });
    });

    describe('Signin', () => {
      it('should throw an exception if email is empty', () => {
        return pactum.spec()
          .post(
            '/auth/signin',
          )
          .withBody({
            email: '',
            password: dto.password,
          })
          .expectStatus(400);
      });

      it('should throw an exception if password is empty', () => {
        return pactum.spec()
          .post(
            '/auth/signin',
          )
          .withBody({
            email: dto.email,
            password: '',
          })
          .expectStatus(400);
      });

      it('should throw an exception if email and password are empty', () => {
        return pactum.spec()
          .post(
            '/auth/signin',
          )
          .withBody({
            email: '',
            password: '',
          })
          .expectStatus(400);
      });

      it('should throw an exception if body has no params provided', () => {
        return pactum.spec()
          .post(
            '/auth/signin',
          )
          .expectStatus(400);
      });

      it('should signin', () => {
        return pactum.spec()
          .post(
            '/auth/signin',
          )
          .withBody(dto)
          .expectStatus(200)
          .stores('userToken', 'access_token');
          // .inspect();
      });
    });

  });

  describe('User', () => {

    describe('Get info', () => {
      it('should get user info based on available token', () => {
        return pactum.spec()
          .get('/users/info')
          .withHeaders({
            Authorization: 'Bearer $S{userToken}'
          })
          .expectStatus(200)
          .inspect();
      });
    });

    describe('Edit user', () => {
      it('should edit user', () => {
        const dto: EditUserDto = {
          firstName: 'Kotomono',
          lastName: 'Nestjs',
          email: 'kotomono@gmail.com'
        };

        return pactum.spec()
          .patch('/users')
          .withHeaders({
            Authorization: 'Bearer $S{userToken}'
          })
          .withBody(dto)
          .expectBodyContains(dto.firstName)
          .expectBodyContains(dto.firstName)
          .expectBodyContains(dto.lastName)
          .expectStatus(200);
      });
    });

  });

  describe('Bookmark', () => {

    describe('Get empty bookmark', () => {
      it('should get empty bookmarks', () => {
        return pactum.spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userToken}'
          })
          .expectStatus(200)
          .expectBody([]);
      });
    });

    describe('Create new bookmark', () => {
      const dto: CreateBookmarkDto = {
        title: 'First Bookmark',
        description: "My first bookmark",
        link: 'https://www.youtube.com/watch?v=GHTA143_b-s&t=11112s'
      };

      it('should create bookmark', () => {
        return pactum.spec()
          .post('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userToken}'
          })
          .withBody(dto)
          .expectStatus(201)
          .stores('bookmarkId', 'id');
      });
    });

    describe('Get bookmarks', () => {
      it('should get bookmarks', () => {
        return pactum.spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userToken}'
          })
          .expectStatus(200)
          .expectJsonLength(1);
      });
    });

    describe('Get bookmark by id', () => {
      it('should get bookmark by id', () => {
        return pactum.spec()
          .get('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userToken}'
          })
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}')
          .inspect();
      });
    });

    describe('Edit bookmark', () => {
      const dto: EditBookmarkDto = {
        title: 'NestJs Course for Beginners - Create a REST API',
        description: 'Learn NestJs by building a CRUD REST API with end-to-end tests using modern web development techniques. NestJs is a rapidly growing node js framework that helps build scalable and maintainable backend applications.'
      }

      it('should edit bookmark by id', () => {
        return pactum.spec()
          .patch('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userToken}'
          })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.title)
          .expectBodyContains(dto.description)
          .inspect();
      });
    });

    describe('Delete bookmark', () => {
      it('should delete bookmark by id', () => {
        return pactum.spec()
          .delete('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userToken}'
          })
          .expectStatus(204);
      });

      it('should get empty bookmarks', () => {
        return pactum.spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userToken}'
          })
          .expectStatus(200)
          .expectJsonLength(0);
      });
    });

  });

});